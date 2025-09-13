import sys
import os
from pathlib import Path
import weaviate
from weaviate.classes.init import Auth
from weaviate.classes.query import Filter
from typing import List, Set, Tuple

# Add the project root to the Python path
sys.path.append(str(Path(__file__).resolve().parents[2]))

from app.config import Settings
from app.retrievers.base_retriever import BaseRetriever, RetrievalResult
from app.utils.logger import setup_logger
from app.embedding.embedding_manager import KeyWordEmbeddingManager
from dotenv import load_dotenv

logger = setup_logger(__name__)
load_dotenv()

class WeaviateRetriever(BaseRetriever):
    """Retrieves results from Weaviate based on a Vietnamese text query."""

    def __init__(self, settings: Settings):
        self.settings = settings
        self.class_name = "VideoText"
        self.WEAVIATE_API_KEY = os.getenv('WEAVIATE_API_KEY')

        if not self.settings.WEAVIATE_URL or self.settings.WEAVIATE_URL == 'YOUR_WEAVIATE_URL':
            raise ValueError("Weaviate URL is not configured.")
        if not self.WEAVIATE_API_KEY or self.WEAVIATE_API_KEY == 'YOUR_WEAVIATE_API_KEY':
            raise ValueError("Weaviate API key is not configured.")

        self.client = weaviate.connect_to_weaviate_cloud(
            cluster_url=self.settings.WEAVIATE_URL,
            auth_credentials=Auth.api_key(api_key=self.WEAVIATE_API_KEY)
        )
        logger.info("WeaviateRetriever initialized and client connected.")
        
        self.model = KeyWordEmbeddingManager()

    def retrieve(self, query: str, candidate_keyframes: Set[Tuple[str, str]], top_k: int = 100) -> List[RetrievalResult]:
        """
        Filters candidate keyframes based on a Vietnamese hybrid search query.
        """
        if not query:
            return []

        if not candidate_keyframes:
            logger.warning("WeaviateRetriever received no candidate keyframes.")
            return []

        logger.info(f"WeaviateRetriever received query: '{query}' for {len(candidate_keyframes)} candidates.")

        # 1. Extract unique video IDs from candidates
        candidate_video_ids = list(set(video_id for video_id, _, _ in candidate_keyframes))

        try:
            collection = self.client.collections.get(self.class_name)

            # 2. Encode query → vector
            query_vector = self.model.encode(query).tolist()

            # 3. Create filter for candidate video IDs
            where_filter = Filter.by_property("video_id").contains_any(candidate_video_ids)

            # 4. Hybrid search (text + vector)
            response = collection.query.hybrid(
                query=query,                 # keyword search
                vector=query_vector,         # semantic search
                query_properties=["title", "description", "keywords", "content"],
                alpha=0.5,
                limit=len(candidate_video_ids),
                filters=where_filter,
                return_metadata=["score"]
            )

        except Exception as e:
            logger.error(f"An error occurred during Weaviate query: {e}", exc_info=True)
            return []

        # 5. Parse response
        if not response.objects:
            logger.info("Weaviate query returned no matching documents.")
            return []

        video_scores = {}
        logger.info(f"Weaviate response objects: {response.objects}")
        for obj in response.objects:
            video_id = obj.properties.get('video_id')
            score = getattr(obj.metadata, "score", 0.0)
            if video_id:
                video_scores[video_id] = score

        logger.info(f"Weaviate returned {len(video_scores)} videos matching the query.")

        # 6. Build results
        final_results = []
        for video_id, keyframe_n, keyframe_index in candidate_keyframes:
            if video_id in video_scores:

                result = RetrievalResult(
                    video_id=video_id,
                    keyframe_index=keyframe_index,
                    keyframe_id=keyframe_n,
                    similarity_score=video_scores[video_id],
                    additional_info={"retriever": "weaviate"}
                )
                final_results.append(result)

        # 7. Sort + top_k
        final_results.sort(key=lambda x: x.similarity_score, reverse=True)
        logger.info(f"Returning {len(final_results[:top_k])} filtered results from WeaviateRetriever.")
        return final_results[:top_k]

    def close(self):
        if hasattr(self, 'client'):
            self.client.close()
            logger.info("WeaviateRetriever client connection closed.")

    def __del__(self):
        self.close()
