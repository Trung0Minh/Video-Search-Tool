# Decompiled with PyLingual (https://pylingual.io)
# Internal filename: D:\AIC\video_retrieval_project\backend\app\core\database_manager.py
# Bytecode version: 3.11a7e (3495)
# Source timestamp: 2025-09-08 10:31:14 UTC (1757327474)

from dataclasses import dataclass
from typing import List, Set, Tuple, Optional
import numpy as np
from qdrant_client import QdrantClient, models
from ..config import settings
from ..utils.logger import setup_logger
logger = setup_logger(__name__)

@dataclass
class SearchResult:
    video_id: str
    keyframe_id: str
    keyframe_index: int
    similarity_score: float

class QdrantManager:
    """Interface with the Qdrant vector database for searching."""

    def __init__(self):
        self.client = QdrantClient(host=settings.QDRANT_HOST, port=settings.QDRANT_PORT)
        self.keyframe_collection = settings.QDRANT_KEYFRAME_COLLECTION
    pass
    pass

    def search_similar(self, query_vector: np.ndarray, filter_keyframes: Optional[Set[Tuple[str, str]]]=None, top_k: int=50) -> List[SearchResult]:
        """Search for similar vectors in the keyframe collection."""
        try:
            query_filter = None
            if filter_keyframes is not None:
                if not filter_keyframes:
                    return []
                should_conditions = [models.Filter(must=[models.FieldCondition(key='video_id', match=models.MatchValue(value=video_id)), models.FieldCondition(key='keyframe_id', match=models.MatchValue(value=keyframe_id))]) for video_id, keyframe_id in filter_keyframes]
                query_filter = models.Filter(should=should_conditions)
            search_hits = self.client.search(collection_name=self.keyframe_collection, query_vector=query_vector.tolist(), query_filter=query_filter, limit=top_k, with_payload=True)
            results = [SearchResult(video_id=hit.payload['video_id'], keyframe_id=hit.payload['keyframe_id'], keyframe_index=hit.payload['keyframe_index'], similarity_score=hit.score) for hit in search_hits]
            return results
        except Exception as e:
            logger.error(f'Error during Qdrant search: {e}', exc_info=True)
            return []