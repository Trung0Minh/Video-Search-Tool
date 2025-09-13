from sentence_transformers import SentenceTransformer
from typing import List, Union
from ..utils.logger import setup_logger
from .base_embedding import EmbeddingModel
logger = setup_logger(__name__)

class KeyWordEmbeddingManager(EmbeddingModel):

    def load_model(self) -> bool:
        """Load sentence transformer model"""
        try:
            self.model = SentenceTransformer(self.settings.KEYWORD_EMBEDDING_MODEL)
            logger.info(f'Loaded embedding model: {self.settings.KEYWORD_EMBEDDING_MODEL}')
            return True
        except Exception as e:
            logger.error(f'Error loading model: {e}')
            return False

    def standardize_keywords(self, keywords: List[str]) -> List[str]:
        """Standardize keywords by lowercasing and stripping whitespace."""
        return [kw.lower().strip() for kw in keywords]

class QueryEmbeddingManager(EmbeddingModel):

    def load_model(self) -> bool:
        """Load sentence transformer model"""
        try:
            self.model = SentenceTransformer(self.settings.QUERY_EMBEDDING_MODEL)
            logger.info(f'Loaded embedding model: {self.settings.QUERY_EMBEDDING_MODEL}')
            return True
        except Exception as e:
            logger.error(f'Error loading model: {e}')
            return False