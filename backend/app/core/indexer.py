import sys
from pathlib import Path

# Add the project root to the Python path
sys.path.append(str(Path(__file__).resolve().parents[2]))

from qdrant_client import models
from tqdm import tqdm
import numpy as np

from app.config import settings
from app.core.data_loader import DataLoader
from app.retrievers.clip_retriever import CLIPRetriever
from app.core.database_manager import QdrantManager
from app.utils.logger import setup_logger
from app.utils.file_utils import load_npy

logger = setup_logger(__name__)

class Indexer:
    """Handles indexing data into Elasticsearch and Qdrant."""

    def __init__(self, data_loader: DataLoader, clip_retriever: CLIPRetriever, qdrant_manager: QdrantManager):
        self.data_loader = data_loader
        self.clip_retriever = clip_retriever
        self.qdrant_manager = qdrant_manager

    def run(self):
        """Run the full indexing process."""
        logger.info("Starting indexing process...")
        self.create_qdrant_collection()
        self.index_data()
        logger.info("Indexing process complete.")

    def create_qdrant_collection(self):
        """Recreate the Qdrant collection (delete if exists, then create)."""
        collection_name = self.qdrant_manager.keyframe_collection

        # Lấy kích thước vector từ model
        #vector_size = self.clip_retriever.embedding_manager.model.get_sentence_embedding_dimension()
        #logger.info(f"Recreating Qdrant collection '{collection_name}' with vector size: {vector_size}")

        # Sử dụng recreate_collection trực tiếp
        self.qdrant_manager.client.recreate_collection(
            collection_name=collection_name,
            vectors_config=models.VectorParams(size=512, distance=models.Distance.COSINE),
        )

    def index_data(self):
        """Index the data from the DataLoader into Qdrant."""
        logger.info("Indexing data based on one .npy file per video...")
        points = []
        point_id_counter = 0
        batch_size = 100
        
        clip_features_path = self.data_loader.settings.CLIP_FEATURES_PATH
        # Get a list of all .npy files, which represent our videos
        video_feature_files = list(clip_features_path.glob('**/*.npy'))

        if not video_feature_files:
            logger.error(f"No .npy files found in {clip_features_path}. Aborting.")
            return

        for file_path in tqdm(video_feature_files, desc="Processing Video Files"):
            video_id = file_path.stem
            video_embeddings = load_npy(str(file_path))

            if video_embeddings is None:
                logger.warning(f"Could not load embeddings for video {video_id}. Skipping.")
                continue

            keyframe_map_df = self.data_loader.keyframe_mappings.get(video_id)
            if keyframe_map_df is None:
                logger.warning(f"No keyframe mapping found for video {video_id}. Skipping.")
                continue
            
            # Sort the mapping by the keyframe sequence 'n' to ensure order matches the numpy array
            keyframe_map_df = keyframe_map_df.sort_values(by='n').reset_index()

            if len(video_embeddings) != len(keyframe_map_df):
                logger.warning(
                    f"Mismatch between embedding count ({len(video_embeddings)}) and keyframe mapping count ({len(keyframe_map_df)}) for video {video_id}. Skipping."
                )
                continue
            
            # Iterate through embeddings and corresponding mapping data
            for idx, vector in enumerate(video_embeddings):
                # The keyframe_id is its 0-based index, formatted
                keyframe_id = f"{idx + 1:03d}"
                
                # Get the corresponding row from the sorted dataframe
                mapping_row = keyframe_map_df.iloc[idx]
                keyframe_index = int(mapping_row['frame_idx'])

                points.append(models.PointStruct(
                    id=point_id_counter,
                    vector=vector.tolist(),
                    payload={
                        "video_id": video_id,
                        "keyframe_id": keyframe_id,
                        "keyframe_index": keyframe_index,
                    }
                ))
                point_id_counter += 1

                # When the batch is full, send it to Qdrant and reset.
                if len(points) >= batch_size:
                    self.qdrant_manager.client.upsert(
                        collection_name=self.qdrant_manager.keyframe_collection,
                        points=points,
                        wait=True
                    )
                    points = [] # Reset for the next batch

        # After the loop, upsert any remaining points.
        if points:
            logger.info(f"Upserting final batch of {len(points)} points...")
            self.qdrant_manager.client.upsert(
                collection_name=self.qdrant_manager.keyframe_collection,
                points=points,
                wait=True
            )
        
        logger.info("Finished upserting all points.")

# Main function remains the same
def main():
    import argparse
    parser = argparse.ArgumentParser(description="Indexer for the Video Retrieval System.")
    parser.add_argument("--force", action="store_true", help="Force re-indexing even if index and collection exist.")
    args = parser.parse_args()

    logger.info("Initializing components for indexing...")
    data_loader = DataLoader(settings)
    if not data_loader.load_all(force_reload=args.force):
        logger.error("Failed to load data. Aborting indexing.")
        return

    clip_retriever = CLIPRetriever()
    qdrant_manager = QdrantManager()

    indexer = Indexer(data_loader, clip_retriever, qdrant_manager)
    indexer.run()

if __name__ == "__main__":
    main()