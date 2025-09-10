import sys
from pathlib import Path

# Add the project root to the Python path
project_root = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(project_root))

from contextlib import asynccontextmanager
from typing import List, Set, Tuple, Optional
from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import pandas as pd
import os

from app.config import settings
from app.core.data_loader import DataLoader
from app.query_builder import QueryBuilder
from app.retrievers.clip_retriever import CLIPRetriever
# from app.retrievers.es_retriever import ElasticsearchRetriever
from app.utils.logger import setup_logger
from fastapi.responses import FileResponse

logger = setup_logger(__name__)
app_state = {}

@asynccontextmanager
async def lifespan(app: FastAPI):
    app_state["is_ready"] = False
    logger.info("Server starting up...")
    data_loader = DataLoader(settings)
    data_loader.load_all()
    # app_state["es_retriever"] = ElasticsearchRetriever(settings.ES_HOST, settings.ES_INDEX_NAME)
    app_state["clip_retriever"] = CLIPRetriever()
    logger.info("Warming up embedding models...")
    app_state["clip_retriever"].embedding_manager.encode_text("warm-up")
    logger.info("Embedding models are ready.")
    app_state["data_loader"] = data_loader
    app_state["query_builder"] = QueryBuilder()
    app_state["is_ready"] = True
    logger.info("Server startup complete. READY")
    yield
    logger.info("Server shutting down...")
    app_state.clear()

app = FastAPI(lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True, allow_methods=["*"], allow_headers=["*"],
)
app.mount("/static", StaticFiles(directory=settings.DATA_ROOT), name="static")
# app.mount("/", StaticFiles(directory="backend/static", html=True), name="static_frontend")

class SearchFilters(BaseModel):
    keyword: Optional[str] = None; object: Optional[str] = None

class SearchRequest(BaseModel):
    queries: List[str]
    retriever: str
    filters: SearchFilters
    top_k: int = 100
    top_k_per_query: Optional[int] = 10

class SearchResultItem(BaseModel):
    video_id: str
    keyframe_id: str
    keyframe_index: int

# def get_es_retriever(): return app_state["es_retriever"]
def get_clip_retriever(): return app_state["clip_retriever"]
def get_query_builder(): return app_state["query_builder"]
def get_data_loader(): return app_state["data_loader"]

@app.get("/api/health")
async def health_check():
    if app_state.get("is_ready"): return {"status": "ready"}
    raise HTTPException(status_code=503, detail="Service not ready")

@app.get("/api/video_keyframes/{video_id}", response_model=dict)
async def get_video_keyframes(video_id: str, data_loader: DataLoader = Depends(get_data_loader)):
    keyframes = data_loader.get_keyframes_for_video(video_id)
    if not keyframes: raise HTTPException(status_code=404, detail="Video not found.")
    return {"keyframes": keyframes}

@app.get("/api/video_info/{video_id}", response_model=dict)
async def get_video_info(video_id: str, data_loader: DataLoader = Depends(get_data_loader)):
    """Endpoint to get metadata for a video, like FPS."""
    fps = data_loader.get_video_fps(video_id)
    if fps is None:
        raise HTTPException(status_code=404, detail="Video info or FPS not found.")
    return {"fps": fps}

@app.post("/api/search", response_model=dict)
async def search(
    request: SearchRequest,
    # es_retriever: ElasticsearchRetriever = Depends(get_es_retriever),
    clip_retriever: CLIPRetriever = Depends(get_clip_retriever),
    query_builder: QueryBuilder = Depends(get_query_builder)
):
    if not app_state.get("is_ready"): raise HTTPException(status_code=503, detail="Service is starting up.")
    
    query_builder.reset()
    candidate_keyframes: Optional[Set[Tuple[str, str]]] = None
    has_filters = request.filters.keyword or request.filters.object

    # Filter logic can be re-integrated here if needed

    if not request.queries:
        return {"results": []}

    if request.retriever == 'clip':
        # The retrieve method will now handle both single and temporal queries
        search_results = clip_retriever.retrieve(
            queries=request.queries,
            candidate_keyframes=candidate_keyframes,
            top_k=request.top_k,
            top_k_per_query=request.top_k_per_query
        )
    else:
        raise HTTPException(status_code=400, detail="Invalid retriever.")
        
    logger.info(f"Returning {len(search_results)} search results.")
    return {"results": search_results}

@app.get("/api/video/{video_id}")
async def get_video_file(video_id: str, request: Request):
    """
    Endpoint to stream a video file with proper HTTP range request support for seeking.
    """
    video_path = settings.VIDEOS_PATH / f"{video_id}.mp4"

    # Security check: ensure the file exists before trying to serve it
    if not video_path.is_file():
        raise HTTPException(status_code=404, detail="Video file not found")
    
    file_size = video_path.stat().st_size
    range_header = request.headers.get('range')
    
    if range_header:
        # Parse the range header (e.g., "bytes=0-1023")
        range_match = range_header.replace('bytes=', '').split('-')
        start = int(range_match[0]) if range_match[0] else 0
        end = int(range_match[1]) if range_match[1] else file_size - 1
        
        # Ensure valid range
        start = max(0, start)
        end = min(file_size - 1, end)
        content_length = end - start + 1
        
        def iter_file_range():
            with open(video_path, 'rb') as f:
                f.seek(start)
                remaining = content_length
                while remaining:
                    chunk_size = min(8192, remaining)  # 8KB chunks
                    chunk = f.read(chunk_size)
                    if not chunk:
                        break
                    remaining -= len(chunk)
                    yield chunk
        
        headers = {
            'Content-Range': f'bytes {start}-{end}/{file_size}',
            'Accept-Ranges': 'bytes',
            'Content-Length': str(content_length),
            'Content-Type': 'video/mp4',
        }
        
        return StreamingResponse(
            iter_file_range(),
            status_code=206,  # Partial Content
            headers=headers
        )
    
    else:
        # No range header, serve the entire file
        def iter_file():
            with open(video_path, 'rb') as f:
                while True:
                    chunk = f.read(8192)  # 8KB chunks
                    if not chunk:
                        break
                    yield chunk
        
        headers = {
            'Accept-Ranges': 'bytes',
            'Content-Length': str(file_size),
            'Content-Type': 'video/mp4',
        }
        
        return StreamingResponse(
            iter_file(),
            status_code=200,
            headers=headers
        )