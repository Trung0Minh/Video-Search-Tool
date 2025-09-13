import uvicorn
from app.config import settings
from app.web_server import app

if __name__ == "__main__":
    uvicorn.run(
        "app.web_server:app",  # Pass the app as an import string for reload/workers
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.RELOAD,
        workers=settings.WORKERS,
    )