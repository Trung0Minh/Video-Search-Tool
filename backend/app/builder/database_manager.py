from dataclasses import dataclass
from typing import List, Set, Tuple, Optional
import numpy as np
from qdrant_client import QdrantClient, models
from ..config import settings
from ..utils.logger import setup_logger
from dotenv import load_dotenv
import os
logger = setup_logger(__name__)

@dataclass
class SearchResult:
    pack: str
    video: str
    frame: str
    frame_index: int
    similarity_score: float

def load_client() -> QdrantClient:
    load_dotenv()
    api_key = os.getenv("QDRANT_TOKEN_READ")
    client = QdrantClient(
        url=settings.QDRANT_CLOUD_URL,  # URL Qdrant Cloud
        api_key=api_key,
        timeout=60,
    )
    return client

class QdrantManager:
    """Interface with the Qdrant vector database for searching."""

    def __init__(self):
        self.client = load_client()
        self.keyframe_collection = settings.QDRANT_KEYFRAME_COLLECTION

    def _build_filter(self, packs: Optional[List[str]] = None, videos: Optional[List[str]] = None, excluded_videos: Optional[List[str]] = None) -> Optional[models.Filter]:
        must_conditions = []
        must_not_conditions = []

        if packs:
            must_conditions.append(models.FieldCondition(key='pack', match=models.MatchAny(any=packs)))
        
        if videos:
            video_conditions = []
            for video_id in videos:
                if '_' in video_id:
                    pack, video = video_id.split('_', 1)
                    video_conditions.append(models.Filter(must=[
                        models.FieldCondition(key='pack', match=models.MatchValue(value=pack)),
                        models.FieldCondition(key='video', match=models.MatchValue(value=video))
                    ]))
            if video_conditions:
                must_conditions.append(models.Filter(should=video_conditions))

        if excluded_videos:
            for video_id in excluded_videos:
                if '_' in video_id:
                    pack, video = video_id.split('_', 1)
                    must_not_conditions.append(models.Filter(must=[
                        models.FieldCondition(key='pack', match=models.MatchValue(value=pack)),
                        models.FieldCondition(key='video', match=models.MatchValue(value=video))
                    ]))

        if not must_conditions and not must_not_conditions:
            return None
        
        return models.Filter(must=must_conditions if must_conditions else None, must_not=must_not_conditions if must_not_conditions else None)

    def scroll_all(self, packs: Optional[List[str]] = None, videos: Optional[List[str]] = None, excluded_videos: Optional[List[str]] = None, limit: int = 100) -> List[SearchResult]:
        """Scroll through all vectors with an optional filter."""
        try:
            query_filter = self._build_filter(packs, videos, excluded_videos)

            scroll_response, _ = self.client.scroll(
                collection_name=self.keyframe_collection,
                scroll_filter=query_filter,
                limit=limit,
                with_payload=True
            )
            
            results = [
                SearchResult(
                    pack=hit.payload['pack'], 
                    video=hit.payload['video'], 
                    frame=hit.payload['frame'], 
                    frame_index=hit.payload['frame_index'], 
                    similarity_score=1.0
                ) for hit in scroll_response
            ]
            return results
        except Exception as e:
            logger.error(f'Error during Qdrant scroll: {e}', exc_info=True)
            return []

    def search_similar(self, query_vector: np.ndarray, top_k: int=50, packs: Optional[List[str]] = None, videos: Optional[List[str]] = None, excluded_videos: Optional[List[str]] = None) -> List[SearchResult]:
        """Search for similar vectors in the keyframe collection."""
        try:
            query_filter = self._build_filter(packs, videos, excluded_videos)

            search_hits = self.client.search(
                collection_name=self.keyframe_collection, 
                query_vector=query_vector.tolist(), 
                query_filter=query_filter, 
                limit=top_k, 
                with_payload=True
            )
            results = [SearchResult(pack=hit.payload['pack'], video=hit.payload['video'], frame=hit.payload['frame'], frame_index=hit.payload['frame_index'], similarity_score=hit.score) for hit in search_hits]
            return results
        except Exception as e:
            logger.error(f'Error during Qdrant search: {e}', exc_info=True)
            return []