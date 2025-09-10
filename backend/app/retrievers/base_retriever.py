# Decompiled with PyLingual (https://pylingual.io)
# Internal filename: D:\AIC\video_retrieval_project\backend\app\retrievers\base_retriever.py
# Bytecode version: 3.11a7e (3495)
# Source timestamp: 2025-09-08 10:19:27 UTC (1757326767)

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import List, Set, Tuple, Dict, Any

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
    def retrieve(self, query: str, candidate_keyframes: Set[Tuple[str, str]], top_k: int=100) -> List[RetrievalResult]:
        """Retrieve most relevant keyframes"""
        return