from typing import List, Set, Tuple, Optional, Dict
from collections import defaultdict
from functools import reduce

import numpy as np

from .base_retriever import BaseRetriever, RetrievalResult
from ..builder.database_manager import QdrantManager
from ..embedding.embedding_manager import QueryEmbeddingManager
from ..utils.logger import setup_logger

logger = setup_logger(__name__)

class CLIPRetriever(BaseRetriever):
    """CLIP-based semantic image retrieval."""

    def __init__(self):
        self.qdrant_manager = QdrantManager()
        self.embedding_manager = QueryEmbeddingManager()

    def retrieve(self, queries: List[str], top_k: int = 100, top_k_per_query: int = 10, packs: Optional[List[str]] = None, videos: Optional[List[str]] = None, excluded_videos: Optional[List[str]] = None) -> List:
        """
        Retrieve using CLIP embeddings. Handles both single and temporal queries.
        If queries are empty but filters are provided, it scrolls through the filtered results.
        """
        if not queries or (len(queries) == 1 and not queries[0]):
            if packs or videos:
                logger.info(f"No query provided, scrolling through filters: packs={packs}, videos={videos}, excluded_videos={excluded_videos}")
                return self._scroll_filtered(packs, videos, excluded_videos, top_k)
            else:
                logger.warning('CLIP retrieval called with an empty query list and no filters.')
                return []

        if len(queries) == 1:
            return self._retrieve_single(queries[0], top_k, packs, videos, excluded_videos)
        else:
            valid_queries = [q for q in queries if q]
            if not valid_queries:
                if packs or videos:
                    logger.info(f"No valid queries for temporal search, scrolling through filters: packs={packs}, videos={videos}, excluded_videos={excluded_videos}")
                    return self._scroll_filtered(packs, videos, excluded_videos, top_k)
                else:
                    logger.warning('Temporal retrieval called with no valid queries and no filters.')
                    return []
            elif len(valid_queries) == 1:
                 return self._retrieve_single(valid_queries[0], top_k, packs, videos, excluded_videos)

            return self._retrieve_temporal(valid_queries, top_k, top_k_per_query, packs, videos, excluded_videos)
    
    def _scroll_filtered(self, packs: Optional[List[str]], videos: Optional[List[str]], excluded_videos: Optional[List[str]], top_k: int) -> List[Dict]:
        """Scrolls through all keyframes for the given filters."""
        try:
            scroll_results = self.qdrant_manager.scroll_all(
                packs=packs,
                videos=videos,
                excluded_videos=excluded_videos,
                limit=top_k
            )
            results = [
                {
                    "video": f"{r.pack}_{r.video}",
                    "frame": r.frame,
                    "frame_index": r.frame_index
                } for r in scroll_results
            ]
            logger.info(f"Scrolled and retrieved {len(results)} results for filters: packs={packs}, videos={videos}, excluded_videos={excluded_videos}")
            return results
        except Exception as e:
            logger.error(f'Error in scrolling with filters: {e}', exc_info=True)
            return []

    def _retrieve_single(self, query: str, top_k: int, packs: Optional[List[str]] = None, videos: Optional[List[str]] = None, excluded_videos: Optional[List[str]] = None) -> List[Dict]:
        """Handles a single query."""
        if not query:
            logger.warning('CLIP retrieval called with an empty query.')
            return []
        try:
            query_embedding = self.embedding_manager.encode(query)[0]
            search_results = self.qdrant_manager.search_similar(
                query_vector=query_embedding,
                top_k=top_k,
                packs=packs,
                videos=videos,
                excluded_videos=excluded_videos
            )
            results = [
                {
                    "video": f"{r.pack}_{r.video}",
                    "frame": r.frame,
                    "frame_index": r.frame_index
                } for r in search_results
            ]
            logger.info(f"Retrieved {len(results)} results for query: '{query}' with filters: packs={packs}, videos={videos}, excluded_videos={excluded_videos}")
            return results
        except Exception as e:
            logger.error(f'Error in single CLIP retrieval: {e}', exc_info=True)
            return []

    def _retrieve_temporal(self, queries: List[str], top_k: int, top_k_per_query: int, packs: Optional[List[str]] = None, videos: Optional[List[str]] = None, excluded_videos: Optional[List[str]] = None) -> List[Dict]:
        """Handles a temporal (multi-query) search."""
        logger.info(f"Performing temporal retrieval for queries: {queries} with filters: packs={packs}, videos={videos}, excluded_videos={excluded_videos}")
        try:
            all_query_results = []
            for query in queries:
                query_embedding = self.embedding_manager.encode(query)[0]
                search_results = self.qdrant_manager.search_similar(
                    query_vector=query_embedding,
                    top_k=top_k * 5,  # Fetch more to increase chance of finding intersections
                    packs=packs,
                    videos=videos,
                    excluded_videos=excluded_videos
                )
                all_query_results.append({"query": query, "results": search_results})

            if not all_query_results:
                return []

            video_id_sets = [
                {f"{result.pack}_{result.video}" for result in query_res["results"]}
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
                    full_video_id = f"{result.pack}_{result.video}"
                    if full_video_id in common_video_ids:
                        if len(grouped_by_video[full_video_id][query_text]) < top_k_per_query:
                            grouped_by_video[full_video_id][query_text].append({
                                "video": full_video_id,
                                "frame": result.frame,
                                "frame_index": result.frame_index,
                                "score": result.similarity_score
                            })

            final_results = []
            for video_id, queries_map in grouped_by_video.items():
                if len(queries_map) == len(queries):
                    video_result = {"video": video_id, "query_results": []}
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
