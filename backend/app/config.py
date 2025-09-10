# File: backend/app/config.py - UPDATED VERSION

from pathlib import Path
from pydantic_settings import BaseSettings

# Define the root path of the backend directory
# Assuming the structure is project_root/backend/app/config.py
BACKEND_ROOT = Path(__file__).resolve().parent.parent

class Settings(BaseSettings):
    """Configuration settings for the application."""
    # Server settings
    HOST: str = '0.0.0.0'
    PORT: int = 8000
    RELOAD: bool = True
    WORKERS: int = 1

    # Qdrant settings
    QDRANT_HOST: str = 'localhost'
    QDRANT_PORT: int = 6333
    QDRANT_KEYFRAME_COLLECTION: str = 'keyframe_collection'
    QDRANT_KEYWORD_COLLECTION: str = 'keyword_collection'

    # Elasticsearch settings
    # ES_HOST: str = 'http://localhost:9200'
    # ES_INDEX_NAME: str = 'video_retrieval_index'

    # Data paths (No changes needed here, just for context)
    DATA_ROOT: Path = BACKEND_ROOT / 'data'
    VIDEOS_PATH: Path = DATA_ROOT / 'video'
    KEYFRAMES_PATH: Path = DATA_ROOT / 'keyframes'
    MAP_KEYFRAMES_PATH: Path = DATA_ROOT / 'map-keyframes'
    MEDIA_INFO_PATH: Path = DATA_ROOT / 'media-info'
    OBJECTS_PATH: Path = DATA_ROOT / 'objects'
    CLIP_FEATURES_PATH: Path = DATA_ROOT / 'clip-features-32'
    FUSED_DATA_PATH: Path = DATA_ROOT / 'fused-data'

    # Cache path
    CACHE_PATH: Path = BACKEND_ROOT / 'cache'

    # Model settings
    QUERY_EMBEDDING_MODEL: str = 'clip-ViT-B-32'
    # KEYWORD_EMBEDDING_MODEL: str = 'sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2'

    # Search settings
    DEFAULT_TOP_K: int = 100

# Create a single instance of the settings
settings = Settings()