from typing import List, Dict, Any

class QueryBuilder:
    """Builds an Elasticsearch query step-by-step from individual filters."""

    def __init__(self):
        self.reset()

    def reset(self):
        """Clears all current filters and resets the query."""
        self._must_clauses: List[Dict[str, Any]] = []
        self._filter_clauses: List[Dict[str, Any]] = []
        self._active_filters_text: List[str] = []

    def add_text_filter(self, text_query: str):
        """Adds a text search clause (approximate match)."""
        if text_query:
            self._must_clauses.append({
                'multi_match': {
                    'query': text_query,
                    'fields': ['title^2', 'description', 'keywords']
                }
            })
            self._active_filters_text.append(f"Text contains: '{text_query}'")

    def add_author_filter(self, authors: List[str]):
        """Adds an author filter clause (exact match)."""
        if authors:
            self._filter_clauses.append({'terms': {'author': authors}})
            self._active_filters_text.append(f'Author is one of: {authors}')

    def add_object_filter(self, objects: List[str], scores: List[float] = None):
        """Adds a separate nested filter for each object and its corresponding score."""
        if not objects:
            return

        for i, obj in enumerate(objects):
            nested_must_clauses = [{'term': {'detected_objects.entity': obj}}]
            filter_text = f"Object is '{obj}'"

            if scores and i < len(scores) and (scores[i] is not None):
                min_score = float(scores[i])
                nested_must_clauses.append({
                    'range': {'detected_objects.score': {'gte': min_score}}
                })
                # ✅ dòng bị lỗi đã được sửa:
                filter_text += f' (score >= {min_score})'

            self._filter_clauses.append({
                'nested': {
                    'path': 'detected_objects',
                    'query': {'bool': {'must': nested_must_clauses}}
                }
            })
            self._active_filters_text.append(filter_text)

    def build_query(self, top_k: int = 100) -> Dict[str, Any]:
        """Assembles and returns the final Elasticsearch query dictionary."""
        if not self._must_clauses and not self._filter_clauses:
            query_body: Dict[str, Any] = {'match_all': {}}
        else:
            query_body = {'bool': {'must': self._must_clauses, 'filter': self._filter_clauses}}

        return {'size': top_k, 'query': query_body}

    def get_active_filters(self) -> List[str]:
        """Returns a list of human-readable active filters."""
        return self._active_filters_text
