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
import re # For security check

from app.config import settings
from backend.app.builder.data_loader import DataLoader
from app.retrievers.clip_retriever import CLIPRetriever
from app.retrievers.weaviate_retriever import WeaviateRetriever
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
    try:
        app_state["weaviate_retriever"] = WeaviateRetriever(settings)
    except ValueError as e:
        logger.error(f"Failed to initialize WeaviateRetriever: {e}. The Vietnamese search filter will be disabled.")
        app_state["weaviate_retriever"] = None
    logger.info("Warming up embedding models...")
    app_state["clip_retriever"].embedding_manager.encode("warm-up")
    logger.info("Embedding models are ready.")
    app_state["data_loader"] = data_loader
    app_state["is_ready"] = True
    logger.info("Server startup complete. READY")
    yield
    logger.info("Server shutting down...")
    app_state.clear()

app = FastAPI(lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True, allow_methods=["*"], allow_headers=["*"],
)
app.mount("/static", StaticFiles(directory=settings.DATA_ROOT), name="static")
# app.mount("/", StaticFiles(directory="backend/static", html=True), name="static_frontend")

class SearchFilters(BaseModel):
    keyword: Optional[str] = None
    object: Optional[str] = None
    packs: Optional[List[str]] = None
    videos: Optional[List[str]] = None
    excluded_videos: Optional[List[str]] = None
    vietnamese_query: Optional[str] = None

class VideosInPacksRequest(BaseModel):
    packs: List[str]

class SearchRequest(BaseModel):
    queries: List[str]
    retriever: str
    filters: SearchFilters
    top_k: int = 100
    top_k_per_query: Optional[int] = 10

class SearchResultItem(BaseModel):
    video: str
    frame: str
    frame_index: int

class SaveSubmissionRequest(BaseModel):
    filename: str
    content: str

# def get_es_retriever(): return app_state["es_retriever"]
def get_clip_retriever(): return app_state["clip_retriever"]
def get_weaviate_retriever(): return app_state["weaviate_retriever"]
def get_query_builder(): return app_state["query_builder"]
def get_data_loader(): return app_state["data_loader"]

@app.get("/api/packs", response_model=List[str])
async def get_available_packs(data_loader: DataLoader = Depends(get_data_loader)):
    """Endpoint to get the list of all available packs."""
    if not app_state.get("is_ready"):
        raise HTTPException(status_code=503, detail="Service not ready")
    
    return data_loader.get_available_packs()

@app.post("/api/videos_in_packs", response_model=List[str])
async def get_videos_in_packs(request: VideosInPacksRequest, data_loader: DataLoader = Depends(get_data_loader)):
    """Endpoint to get the list of videos for a given list of packs."""
    if not app_state.get("is_ready"):
        raise HTTPException(status_code=503, detail="Service not ready")
    
    return data_loader.get_videos_for_packs(request.packs)

@app.get("/api/health")
async def health_check():
    if app_state.get("is_ready"): return {"status": "ready"}
    raise HTTPException(status_code=503, detail="Service not ready")

# @app.get("/api/objects", response_model=List[str])
# async def get_unique_objects(data_loader: DataLoader = Depends(get_data_loader)):
#     """Endpoint to get the list of all unique object detections."""
#     if not app_state.get("is_ready"):
#         raise HTTPException(status_code=503, detail="Service not ready")
    
#     unique_objects = sorted(list(data_loader.all_unique_objects))
#     return unique_objects

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

@app.get("/api/video_details/{video_id}", response_model=dict)
async def get_video_details(video_id: str, data_loader: DataLoader = Depends(get_data_loader)):
    """Endpoint to get video details like watch_url and fps."""
    # Special handling for L28 pack to use Hugging Face URLs
    if video_id.startswith('L28'):
        watch_url = f"https://huggingface.co/datasets/ChungDat/hcm-aic2025-additional-data/resolve/main/video/{video_id}.mp4"
    else:
        metadata = data_loader.video_metadata.get(video_id)
        if not metadata:
            raise HTTPException(status_code=404, detail="Video metadata not found.")
        
        watch_url = metadata.get("watch_url")
        if not watch_url:
            raise HTTPException(status_code=404, detail="Watch URL not found for this video.")

    fps = data_loader.get_video_fps(video_id)
    if fps is None:
        raise HTTPException(status_code=404, detail="FPS not found for this video.")

    return {"watch_url": watch_url, "fps": fps}

@app.post("/api/search", response_model=dict)
async def search(
    request: SearchRequest,
    # es_retriever: ElasticsearchRetriever = Depends(get_es_retriever),
    clip_retriever: CLIPRetriever = Depends(get_clip_retriever),
    weaviate_retriever: WeaviateRetriever = Depends(get_weaviate_retriever),
    data_loader: DataLoader = Depends(get_data_loader)
):
    if not app_state.get("is_ready"): raise HTTPException(status_code=503, detail="Service is starting up.")
    
    # Unpack filters
    packs = request.filters.packs
    videos = request.filters.videos
    excluded_videos = request.filters.excluded_videos
    vietnamese_query = request.filters.vietnamese_query

    # The check for empty queries is now handled by the retriever
    if not request.queries and not packs and not videos:
        logger.warning("Search called with no queries and no pack or video filters.")
        return {"results": []}

    if request.retriever == 'clip':
        # The retrieve method will now handle both single and temporal queries
        search_results = clip_retriever.retrieve(
            queries=request.queries,
            packs=packs,
            videos=videos,
            excluded_videos=excluded_videos,
            top_k=request.top_k,
            top_k_per_query=request.top_k_per_query
        )
    else:
        raise HTTPException(status_code=400, detail="Invalid retriever.")
        
    # --- New Weaviate Filtering Step ---
    if vietnamese_query and weaviate_retriever:
        logger.info(f"Applying Vietnamese filter: '{vietnamese_query}'")
        # Convert initial results to the format WeaviateRetriever expects
        candidate_keyframes = {(res['video'], res['frame'], res['frame_index']) for res in search_results}
        
        retrieved_results = weaviate_retriever.retrieve(
            query=vietnamese_query,
            candidate_keyframes=candidate_keyframes,
            top_k=request.top_k
        )
        
        # Convert RetrievalResult objects to the dictionary format expected by the frontend
        search_results = [
            {
                "video": res.video_id,
                "frame": res.keyframe_id,
                "frame_index": res.keyframe_index,
                "similarity_score": res.similarity_score
            }
            for res in retrieved_results
        ]
        
    elif vietnamese_query and not weaviate_retriever:
        logger.warning("Vietnamese query was provided, but WeaviateRetriever is not available.")

    logger.info(f"Returning {len(search_results)} search results.")
    return {"results": search_results}

@app.post("/api/save_submission")
async def save_submission(request: SaveSubmissionRequest):
    """
    Saves submission content to a CSV file in a predetermined server-side folder.
    """
    logger.info(f"Received request to save submission: {request.filename}")

    # Security: Basic check for valid filename
    if not re.match(r"^[a-zA-Z0-9_-]+$", request.filename):
        raise HTTPException(status_code=400, detail="Invalid filename. Only alphanumeric, underscore, and hyphen are allowed.")

    try:
        # Project root is already defined, so let's use it to build the path
        submissions_dir = project_root / "submissions"
        submissions_dir.mkdir(exist_ok=True)

        # Ensure the final filename has a .csv extension
        filename = f"{request.filename}.csv"
        save_path = submissions_dir / filename

        with open(save_path, "w", encoding="utf-8") as f:
            f.write(request.content)

        logger.info(f"Successfully saved submission to {save_path}")
        return {"message": "Submission saved successfully.", "path": str(save_path)}

    except Exception as e:
        logger.error(f"Failed to save submission file: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to save submission file on the server.")

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