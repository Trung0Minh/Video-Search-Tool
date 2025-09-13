
import sys
from pathlib import Path

# Add the project root to the Python path
sys.path.append(str(Path(__file__).resolve().parents[2]))
import pickle
from pathlib import Path
from typing import Dict, List, Set, Tuple, Optional
import pandas as pd
import os
import json
from tqdm import tqdm
from concurrent.futures import ProcessPoolExecutor, as_completed
import multiprocessing
from app.config import Settings
from app.utils.file_utils import load_csv, load_json
from app.utils.logger import setup_logger
from huggingface_hub import list_repo_files, hf_hub_download

logger = setup_logger(__name__)

def _download_and_load_json(repo_id: str, json_file: str) -> Optional[Tuple[str, dict]]:
    """Worker function to download and load JSON metadata."""
    try:
        local_path = hf_hub_download(repo_id=repo_id, filename=json_file, repo_type="dataset")
        with open(local_path, "r", encoding="utf-8") as f:
            metadata = json.load(f)
        os.remove(local_path)
        if metadata is None:
            return None
        video_id = os.path.splitext(os.path.basename(json_file))[0]
        return video_id, metadata
    except Exception as e:
        logger.error(f"Failed to load {json_file}: {e}")
        return None


def _download_and_load_csv(repo_id: str, csv_file: str) -> Optional[Tuple[str, pd.DataFrame]]:
    """Worker function to download and load CSV keyframe mappings."""
    try:
        local_path = hf_hub_download(repo_id=repo_id, filename=csv_file, repo_type="dataset")
        df = pd.read_csv(local_path, encoding="utf-8")
        os.remove(local_path)
        if df is None or df.empty:
            return None
        video_id = os.path.splitext(os.path.basename(csv_file))[0]
        return video_id, df
    except Exception as e:
        logger.error(f"Failed to load {csv_file}: {e}")
        return None


def _load_local_detection(json_file: Path) -> Optional[Tuple[str, str, dict]]:
    """Worker function to load object detections from local folder."""
    try:
        with open(json_file, "r", encoding="utf-8") as f:
            detection_data = json.load(f)
        if detection_data is None:
            return None

        components = json_file.parts
        video_id = components[-2]
        keyframe_id = os.path.splitext(json_file.name)[0]
        return video_id, keyframe_id, detection_data
    except Exception as e:
        logger.error(f"Failed to load {json_file}: {e}")
        return None


class DataLoader:
    """Loads and caches all necessary data from the data/ directory."""

    def __init__(self, settings: Settings):
        self.settings = settings
        self.cache_dir = Path(settings.CACHE_PATH)
        self.cache_file = self.cache_dir / 'data_cache.pkl'
        self.cache_dir.mkdir(exist_ok=True)
        self.repo_id = self.settings.HF_ADDTIONAL_REPO_ID
        # self.files = list_repo_files(self.repo_id, repo_type="dataset")

        # Configurable workers (default = 4 if not defined in settings)
        self.num_workers: int = getattr(settings, "NUM_WORKERS", 8)
        if self.num_workers <= 0:
            self.num_workers = multiprocessing.cpu_count()


        self.video_metadata: Dict[str, dict] = {}
        self.keyframe_mappings: Dict[str, pd.DataFrame] = {}
        # self.object_detections: Dict[str, dict] = {}
        # self.all_unique_objects: Set[str] = set()

    def load_all(self, force_reload: bool = False) -> bool:
        """Load all data, using cache if available."""
        if self.cache_file.exists() and not force_reload:
            logger.info(f'Loading data from cache: {self.cache_file}')
            try:
                with open(self.cache_file, 'rb') as f:
                    cache_data = pickle.load(f)
                    self.video_metadata = cache_data.get('video_metadata', {})
                    self.keyframe_mappings = cache_data.get('keyframe_mappings', {})
                    # self.object_detections = cache_data.get('object_detections', {})
                    # self.all_unique_objects = cache_data.get('all_unique_objects', set())
                logger.info('Data loaded from cache successfully.')
                return True
            except (OSError, pickle.UnpicklingError) as e:
                logger.warning(f'Could not load cache file: {e}. Reloading from source.')

        try:
            logger.info('Loading data from source files...')
            self.load_video_metadata()
            self.load_keyframe_mappings()
            # self.load_object_detections(self.settings.OBJECTS_PATH)
            logger.info(f'Loaded metadata for {len(self.video_metadata)} videos.')
            logger.info(f'Found {len(self.all_unique_objects)} unique objects.')
            return True
        except Exception as e:
            logger.error(f'An unexpected error occurred during data loading: {e}', exc_info=True)
            return False

    def _save_cache(self):
        """Save all cached data atomically."""
        cache_data = {
            "video_metadata": self.video_metadata,
            "keyframe_mappings": self.keyframe_mappings,
            "all_unique_objects": self.all_unique_objects,
        }
        tmp_file = f"{self.cache_file}.tmp"
        with open(tmp_file, "wb") as f:
            pickle.dump(cache_data, f)
        os.replace(tmp_file, self.cache_file)

    def load_video_metadata(self) -> None:
        logger.info("Loading video metadata...")
        files = [f for f in self.files if f.startswith("media-info/")]
        with ProcessPoolExecutor(max_workers=self.num_workers) as executor:
            futures = [executor.submit(_download_and_load_json, self.repo_id, f) for f in files]
            for future in tqdm(as_completed(futures), total=len(futures), desc="Video Metadata"):
                result = future.result()
                if result:
                    video_id, metadata = result
                    self.video_metadata[video_id] = metadata
        self._save_cache()

    def load_keyframe_mappings(self) -> None:
        logger.info("Loading keyframe mappings...")
        files = [f for f in self.files if f.startswith("map-keyframes/")]
        with ProcessPoolExecutor(max_workers=self.num_workers) as executor:
            futures = [executor.submit(_download_and_load_csv, self.repo_id, f) for f in files]
            for future in tqdm(as_completed(futures), total=len(futures), desc="Keyframe Mappings"):
                result = future.result()
                if result:
                    video_id, df = result
                    self.keyframe_mappings[video_id] = df
        self._save_cache()

    def load_object_detections(self, local_objects_dir: str) -> None:
        """
        Load object detections từ thư mục local.
        """
        logger.info(f'Loading object detections from local: {local_objects_dir}')
        files = [f for f in self.files if f.startswith("objects/")]

        with ProcessPoolExecutor(max_workers=self.num_workers) as executor:
            futures = [executor.submit(_load_local_detection, f) for f in files]
            for future in tqdm(as_completed(futures), total=len(futures), desc="Object Detections"):
                result = future.result()
                if result:
                    video_id, keyframe_id, detection_data = result
                    if 'detection_class_entities' in detection_data:
                        self.all_unique_objects.update(detection_data['detection_class_entities'])

        self._save_cache()

    def get_all_keyframes(self) -> Set[Tuple[str, str]]:
        """Get all (video_id, keyframe_n) tuples in the dataset."""
        keyframes = set()
        for video_id, mappings in self.keyframe_mappings.items():
            for _, row in mappings.iterrows():
                try:
                    keyframe_n = str(int(row['n'])).zfill(3)
                    keyframes.add((video_id, keyframe_n))
                except Exception as e:
                    logger.warning(f"Invalid row in keyframe mapping for {video_id}: {e}")
        return keyframes

    def get_keyframes_for_video(self, video_id: str) -> List[dict]:
        """Get all keyframes (id and index) for a specific video."""
        mapping_df = self.keyframe_mappings.get(video_id)
        if mapping_df is None or mapping_df.empty:
            return []
        return [
            {'keyframe_id': str(int(row['n'])).zfill(3), 'frame_index': int(row['frame_idx'])}
            for _, row in mapping_df.iterrows()
        ]

    def get_video_fps(self, video_id: str) -> Optional[float]:
        """Reads the FPS for a specific video from the cached keyframe mappings."""
        mapping_df = self.keyframe_mappings.get(video_id)
        if mapping_df is None or mapping_df.empty:
            logger.warning(f'No keyframe mapping found for video_id: {video_id}')
            return None
        try:
            if 'fps' in mapping_df.columns:
                fps_val = mapping_df['fps'].iloc[0]
                if pd.notna(fps_val):
                    return float(fps_val)
            logger.warning(f"'fps' column not found or invalid for {video_id}")
            return None
        except (ValueError, IndexError) as e:
            logger.error(f'Error extracting FPS for video {video_id}: {e}')
            return None

    def get_available_packs(self) -> List[str]:
        """Returns a sorted list of unique pack identifiers from video metadata."""
        if not self.video_metadata:
            logger.warning("Video metadata is not loaded, cannot get packs.")
            return []
        
        packs = set()
        for video_id in self.video_metadata.keys():
            if '_' in video_id:
                pack_part = video_id.split('_')[0]
                if len(pack_part) > 1 and pack_part[1:].isdigit():
                    packs.add(pack_part)
        
        if not packs:
            logger.warning("No packs found in video metadata, returning hardcoded list.")
            return ["K01", "K02", "K03", "K04", "K05", "K06", "K07", "K08", "K09", "K10", "K11", "K12", "K13", "K14", "K15", "K16", "K17", "K18", "K19", "K20", "L21", "L22", "L23", "L24", "L25", "L26", "L27", "L28", "L29", "L30", "L31", "L32"]
            
        return sorted(list(packs))

    def get_videos_for_packs(self, packs: List[str]) -> List[str]:
        """Returns a sorted list of video IDs for the given packs."""
        if not self.video_metadata:
            logger.warning("Video metadata is not loaded, cannot get videos for packs.")
            return []
        
        video_ids = set()
        for video_id in self.video_metadata.keys():
            if '_' in video_id:
                pack_part = video_id.split('_')[0]
                if pack_part in packs:
                    video_ids.add(video_id)
        
        return sorted(list(video_ids))