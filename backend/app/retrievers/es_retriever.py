# Decompiled with PyLingual (https://pylingual.io)
# Internal filename: d:\AIC\video_retrieval_project\retrievers\es_retriever.py
# Bytecode version: 3.11a7e (3495)
# Source timestamp: 2025-09-06 11:08:09 UTC (1757156889)

from typing import List, Dict, Any, Tuple
from elasticsearch import Elasticsearch

class ElasticsearchRetriever:
    """Executes queries against the Elasticsearch index."""

    def __init__(self, es_host: str='http://localhost:9200', index_name: str='video_retrieval_index'):
        self.client = Elasticsearch(es_host, request_timeout=30)
        self.index_name = index_name
        if not self.client.ping():
            raise ConnectionError('Could not connect to Elasticsearch.')

    def search(self, es_query: Dict[str, Any]) -> List[Tuple[str, str]]:
        """
        Executes a search query and returns a list of keyframe identifiers.

        Args:
            es_query (Dict[str, Any]): The fully-formed Elasticsearch query.

        Returns:
            List[Tuple[str, str]]: A list of (video_id, keyframe_id) tuples.
        """
        response = self.client.search(index=self.index_name, body=es_query)
        results = []
        for hit in response['hits']['hits']:
            source = hit['_source']
            results.append((source['video_id'], source['keyframe_id']))
        return results