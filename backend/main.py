# File: backend/main.py - CORRECTED VERSION

import uvicorn
from app.config import settings
from app.web_server import app # Keep this import for type hinting and direct use if needed elsewhere

if __name__ == "__main__":
    uvicorn.run(
        "app.web_server:app",  # Pass the app as an import string for reload/workers
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.RELOAD,
        workers=settings.WORKERS,
    )