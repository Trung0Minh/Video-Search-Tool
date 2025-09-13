import sys
import os
from pathlib import Path
import weaviate
from weaviate.classes.init import Auth
from sentence_transformers import SentenceTransformer
import weaviate.classes.config as wvc
from weaviate.collections import Collection
from weaviate.classes.data import DataObject
from tqdm import tqdm

# Add the project root to the Python path
sys.path.append(str(Path(__file__).resolve().parents[2]))

from app.config import Settings
from app.builder.data_loader import DataLoader
from app.utils.logger import setup_logger
from app.utils.text_processing import normalize_text
from dotenv import load_dotenv

load_dotenv()
logger = setup_logger(__name__)

class WeaviateIndexer:
    """Handles indexing data into Weaviate with client-side Hugging Face embeddings."""

    def __init__(self, settings: Settings, dataloader: DataLoader):
        self.settings = settings
        self.dataloader = dataloader
        self.class_name = "VideoText"
        self.WEAVIATE_API_KEY = os.getenv("WEAVIATE_API_KEY")

        # Hugging Face model
        self.embedding_model = SentenceTransformer(self.settings.KEYWORD_EMBEDDING_MODEL)

        # Connect Weaviate
        self.client = weaviate.connect_to_weaviate_cloud(
            cluster_url=self.settings.WEAVIATE_URL,
            auth_credentials=Auth.api_key(api_key=self.WEAVIATE_API_KEY)
        )
        logger.info("Weaviate client initialized.")

    def _delete_collection_if_exists(self):
        """Delete the collection if it exists to recreate with proper schema."""
        try:
            if self.class_name in self.client.collections.list_all():
                logger.warning(f"DELETING existing collection '{self.class_name}' to recreate with proper schema.")
                self.client.collections.delete(self.class_name)
                logger.info(f"Successfully deleted collection '{self.class_name}'.")
        except Exception as e:
            logger.error(f"Error deleting collection: {e}")

    def _create_collection(self):
        """Create the collection with proper schema for hybrid search."""
        if self.class_name in self.client.collections.list_all():
            logger.info(f"Collection '{self.class_name}' already exists. Skipping creation.")
            return

        logger.info(f"Creating collection '{self.class_name}' in Weaviate with proper schema.")

        self.client.collections.create(
            name=self.class_name,
            description="Metadata text for video retrieval",
            vectorizer_config=wvc.Configure.Vectorizer.none(),
            properties=[
                wvc.Property(
                    name="video_id", 
                    data_type=wvc.DataType.TEXT,
                    index_searchable=True,
                    tokenization=wvc.Tokenization.FIELD
                ),
                wvc.Property(
                    name="title", 
                    data_type=wvc.DataType.TEXT, 
                    tokenization=wvc.Tokenization.WORD, 
                    index_searchable=True
                ),
                wvc.Property(
                    name="description", 
                    data_type=wvc.DataType.TEXT, 
                    tokenization=wvc.Tokenization.WORD, 
                    index_searchable=True
                ),
                wvc.Property(
                    name="keywords", 
                    data_type=wvc.DataType.TEXT, 
                    tokenization=wvc.Tokenization.WORD, 
                    index_searchable=True
                ),
                wvc.Property(
                    name="content", 
                    data_type=wvc.DataType.TEXT, 
                    tokenization=wvc.Tokenization.WORD,
                    index_searchable=True
                ),
            ],
        )
        logger.info(f"Successfully created collection '{self.class_name}' with proper schema.")

    def index_videos(self, force_reload: bool = False, recreate_collection: bool = True):
        """Index video metadata with Hugging Face embeddings."""
        logger.info("Starting video text indexing process for Weaviate.")
        
        if recreate_collection:
            self._delete_collection_if_exists()
        
        self._create_collection()

        if not self.dataloader.video_metadata:
            logger.info("Video metadata not found in dataloader, loading now...")
            self.dataloader.load_all(force_reload=force_reload)

        if not self.dataloader.video_metadata:
            logger.error("Failed to load video metadata. Aborting indexing.")
            return

        logger.info(f"Preparing to index metadata for {len(self.dataloader.video_metadata)} videos.")
        collection: Collection = self.client.collections.get(self.class_name)

        objects = []
        for video_id, metadata in tqdm(self.dataloader.video_metadata.items(), desc="Indexing to Weaviate"):
            title = normalize_text(metadata.get("title", "") or "")
            description = normalize_text(metadata.get("description", "") or "")
            keywords_list = [normalize_text(w or "") for w in metadata.get("keywords", [])]
            keywords_list = list(set(keywords_list))
            
            keywords_string = " ".join(keywords_list) if keywords_list else ""

            combined_content = f"{title}. {keywords_string}. {description}".strip()

            vector = self.embedding_model.encode(combined_content).tolist()

            objects.append(
                DataObject(
                    properties={
                        "video_id": video_id,
                        "title": title,
                        "description": description,
                        "keywords": keywords_string,
                        "content": combined_content,
                    },
                    vector=vector
                )
            )

        try:
            with collection.batch.dynamic() as batch:
                for obj in objects:
                    batch.add_object(
                        properties=obj.properties,
                        vector=obj.vector
                    )
            logger.info("Finished indexing all video text data to Weaviate.")
        except Exception as e:
            logger.error(f"Error during batch insertion: {e}", exc_info=True)
            raise

    def close(self):
        """Close the Weaviate client connection."""
        if hasattr(self, 'client'):
            self.client.close()
            logger.info("Weaviate client connection closed.")


# if __name__ == '__main__':
#     settings = Settings()
#     dataloader = DataLoader(settings)
#     indexer = None
    
#     try:
#         indexer = WeaviateIndexer(settings=settings, dataloader=dataloader)
#         # ✅ IMPORTANT: Set recreate_collection=True to fix the schema issue
#         indexer.index_videos(force_reload=False, recreate_collection=True)
#     except ValueError as e:
#         logger.error(f"Configuration error: {e}")
#     except Exception as e:
#         logger.error(f"An unexpected error occurred during indexing: {e}", exc_info=True)
#     finally:
#         # Properly close the connection to avoid resource warnings
#         if indexer:
#             indexer.close()