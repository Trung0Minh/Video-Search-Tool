# Decompiled with PyLingual (https://pylingual.io)
# Internal filename: D:\AIC\video_retrieval_project\backend\app\embedding\base_embedding.py
# Bytecode version: 3.11a7e (3495)
# Source timestamp: 2025-09-08 08:35:18 UTC (1757320518)

from abc import ABC, abstractmethod
from typing import List, Union
import numpy as np
from ..config import settings

class EmbeddingModel(ABC):
    """Abstract base class for embedding models"""

    def __init__(self):
        self.settings = settings
        self.model = None
        self.load_model()
        # self.vector_size = self.model.get_sentence_embedding_dimension()

    @abstractmethod
    def load_model(self) -> bool:
        """Load the embedding model"""
        return

    def encode_text(self, texts: Union[str, List[str]]) -> np.ndarray:
        """Encode text to embeddings"""
        if not self.model:
            raise RuntimeError('Model not loaded')
        if isinstance(texts, str):
            texts = [texts]
        embeddings = self.model.encode(texts)
        return embeddings

    # def compute_similarity(self, text1: str, text2: str) -> float:
    #     """Compute similarity between two texts"""
    #     embeddings = self.encode_text([text1, text2])
    #     dot_product = np.dot(embeddings[0], embeddings[1])
    #     norms = np.linalg.norm(embeddings[0]) * np.linalg.norm(embeddings[1])
    #     return dot_product / norms if norms > 0 else 0.0