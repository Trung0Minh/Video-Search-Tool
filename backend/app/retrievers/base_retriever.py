from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import List, Set, Tuple, Dict, Any
from ..config import settings

@dataclass
class RetrievalResult:
    video_id: str
    keyframe_index: int
    keyframe_id: str
    similarity_score: float
    additional_info: Dict[str, Any] = None

class BaseRetriever(ABC):
    """Abstract base class for retrievers"""

    @abstractmethod
    def retrieve(self, query: str, candidate_keyframes: Set[Tuple[str, str]], top_k: int=settings.DEFAULT_TOP_K) -> List[RetrievalResult]:
        """Retrieve most relevant keyframes"""
        return