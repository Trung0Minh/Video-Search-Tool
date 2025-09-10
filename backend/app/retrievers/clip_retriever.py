from typing import List, Set, Tuple, Optional, Dict
from collections import defaultdict
from functools import reduce

import numpy as np

from .base_retriever import BaseRetriever, RetrievalResult
from ..core.database_manager import QdrantManager
from ..embedding.embedding_manager import QueryEmbeddingManager
from ..utils.logger import setup_logger

logger = setup_logger(__name__)

class CLIPRetriever(BaseRetriever):
    """CLIP-based semantic image retrieval."""

    def __init__(self):
        self.qdrant_manager = QdrantManager()
        self.embedding_manager = QueryEmbeddingManager()

    def retrieve(self, queries: List[str], candidate_keyframes: Optional[Set[Tuple[str, str]]], top_k: int = 100, top_k_per_query: int = 10) -> List:
        """
        Retrieve using CLIP embeddings. Handles both single and temporal queries.
        """
        if not queries:
            logger.warning('CLIP retrieval called with an empty query list.')
            return []

        if len(queries) == 1:
            return self._retrieve_single(queries[0], candidate_keyframes, top_k)
        else:
            return self._retrieve_temporal(queries, candidate_keyframes, top_k, top_k_per_query)

    def _retrieve_single(self, query: str, candidate_keyframes: Optional[Set[Tuple[str, str]]], top_k: int) -> List[Dict]:
        """Handles a single query."""
        if not query:
            logger.warning('CLIP retrieval called with an empty query.')
            return []
        try:
            query_embedding = self.embedding_manager.encode_text(query)[0]
            search_results = self.qdrant_manager.search_similar(
                query_vector=query_embedding,
                filter_keyframes=candidate_keyframes,
                top_k=top_k
            )
            # Return as dicts to match web_server expectations
            results = [
                {
                    "video_id": r.video_id,
                    "keyframe_id": r.keyframe_id,
                    "keyframe_index": r.keyframe_index
                } for r in search_results
            ]
            logger.info(f"Retrieved {len(results)} results for query: '{query}'")
            return results
        except Exception as e:
            logger.error(f'Error in single CLIP retrieval: {e}', exc_info=True)
            return []

    def _retrieve_temporal(self, queries: List[str], candidate_keyframes: Optional[Set[Tuple[str, str]]], top_k: int, top_k_per_query: int) -> List[Dict]:
        """Handles a temporal (multi-query) search."""
        logger.info(f"Performing temporal retrieval for queries: {queries}")
        try:
            all_query_results = []
            for query in queries:
                query_embedding = self.embedding_manager.encode_text(query)[0]
                search_results = self.qdrant_manager.search_similar(
                    query_vector=query_embedding,
                    filter_keyframes=candidate_keyframes,
                    top_k=top_k * 5  # Fetch more to increase chance of finding intersections
                )
                all_query_results.append({"query": query, "results": search_results})

            if not all_query_results:
                return []

            video_id_sets = [
                {result.video_id for result in query_res["results"]}
                for query_res in all_query_results
            ]
            if not video_id_sets:
                return []
            common_video_ids = reduce(lambda a, b: a.intersection(b), video_id_sets)

            if not common_video_ids:
                logger.info("No common videos found for the temporal query.")
                return []

            grouped_by_video = defaultdict(lambda: defaultdict(list))
            for query_res in all_query_results:
                query_text = query_res["query"]
                for result in query_res["results"]:
                    if result.video_id in common_video_ids:
                        if len(grouped_by_video[result.video_id][query_text]) < top_k_per_query:
                            grouped_by_video[result.video_id][query_text].append({
                                "keyframe_id": result.keyframe_id,
                                "keyframe_index": result.keyframe_index,
                                "score": result.similarity_score
                            })

            final_results = []
            for video_id, queries_map in grouped_by_video.items():
                if len(queries_map) == len(queries):
                    video_result = {"video_id": video_id, "query_results": []}
                    for query_text, keyframes in queries_map.items():
                        keyframes.sort(key=lambda x: x["score"], reverse=True)
                        video_result["query_results"].append({
                            "query": query_text,
                            "keyframes": keyframes
                        })
                    final_results.append(video_result)

            logger.info(f"Found {len(final_results)} videos matching temporal query.")
            return final_results

        except Exception as e:
            logger.error(f'Error in temporal CLIP retrieval: {e}', exc_info=True)
            return []
