import sys
from pathlib import Path

# Add the project root to the Python path
sys.path.append(str(Path(__file__).resolve().parents[2]))

from app.config import Settings
from app.builder.data_loader import DataLoader
from app.builder.weaviate_indexer import WeaviateIndexer
from app.utils.logger import setup_logger

logger = setup_logger(__name__)

def main():
    """
    Runs the entire data loading and indexing pipeline.
    """
    logger.info("Starting the full data loading and indexing pipeline...")

    settings = Settings()
    dataloader = DataLoader(settings)
    indexer = None

    try:
        # 1. Load all data from files
        logger.info("--- Step 1: Loading all data ---")
        dataloader.load_all(force_reload=True) # Set force_reload to True to ensure fresh data
        logger.info("--- Step 1: Data loading complete ---")

        # 2. Index data into Weaviate
        logger.info("--- Step 2: Indexing data into Weaviate ---")
        indexer = WeaviateIndexer(settings=settings, dataloader=dataloader)
        indexer.index_videos(force_reload=False, recreate_collection=True) # force_reload is False here as data is already loaded
        logger.info("--- Step 2: Indexing complete ---")

        logger.info("Pipeline finished successfully!")

    except Exception as e:
        logger.error(f"An error occurred during the pipeline: {e}", exc_info=True)
    finally:
        if indexer:
            indexer.close()

if __name__ == "__main__":
    main()
