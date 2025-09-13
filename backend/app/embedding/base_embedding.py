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

    def encode(self, texts: Union[str, List[str]]) -> np.ndarray:
        """Encode text to embeddings"""
        if not self.model:
            raise RuntimeError('Model not loaded')
        if isinstance(texts, str):
            texts = [texts]
        embeddings = self.model.encode(texts)
        return embeddings