# Decompiled with PyLingual (https://pylingual.io)
# Internal filename: D:\AIC\video_retrieval_project\backend\app\core\data_loader.py
# Bytecode version: 3.11a7e (3495)
# Source timestamp: 2025-09-09 07:04:43 UTC (1757401483)

import pickle
from pathlib import Path
from typing import Dict, List, Set, Tuple, Optional
import pandas as pd
from tqdm import tqdm
from ..config import Settings
from ..utils.file_utils import load_csv, load_json
from ..utils.logger import setup_logger
logger = setup_logger(__name__)

class DataLoader:
    """Loads and caches all necessary data from the data/ directory."""

    def __init__(self, settings: Settings):
        self.settings = settings
        self.cache_dir = Path(settings.CACHE_PATH)
        self.cache_dir.mkdir(exist_ok=True)
        self.video_metadata = {}
        self.keyframe_mappings = {}
        self.object_detections = {}
        self.all_unique_objects = set()

    def load_all(self, force_reload: bool=False) -> bool:
        """Load all data, using cache if available."""
        cache_file = self.cache_dir / 'data_cache.pkl'
        if cache_file.exists() and (not force_reload):
            logger.info(f'Loading data from cache: {cache_file}')
            try:
                with open(cache_file, 'rb') as f:
                    cache_data = pickle.load(f)
                    self.video_metadata = cache_data['video_metadata']
                    self.keyframe_mappings = cache_data['keyframe_mappings']
                    self.object_detections = cache_data['object_detections']
                    self.all_unique_objects = cache_data['all_unique_objects']
                    logger.info('Data loaded from cache successfully.')
                    return True
            except (IOError, pickle.PickleError) as e:
                logger.warning(f'Could not load cache file: {e}. Reloading from source.')
        try:
            logger.info('Loading data from source files...')
            self.load_video_metadata()
            self.load_keyframe_mappings()
            self.load_object_detections()
            self._save_cache(cache_file)
            logger.info(f'Loaded metadata for {len(self.video_metadata)} videos.')
            logger.info(f'Found {len(self.all_unique_objects)} unique objects.')
            return True
        except Exception as e:
            logger.error(f'An unexpected error occurred during data loading: {e}', exc_info=True)
            return False

    def _save_cache(self, cache_file: Path):
        logger.info(f'Saving data to cache file: {cache_file}')
        cache_data = {'video_metadata': self.video_metadata, 'keyframe_mappings': self.keyframe_mappings, 'object_detections': self.object_detections, 'all_unique_objects': self.all_unique_objects}
        with open(cache_file, 'wb') as f:
            pickle.dump(cache_data, f)
        logger.info('Cache saved successfully.')

    def load_video_metadata(self):
        logger.info('Loading video metadata...')
        media_info_path = self.settings.MEDIA_INFO_PATH
        if not media_info_path.exists():
            logger.warning(f'Media info path not found: {media_info_path}')
            return
        for json_file in tqdm(media_info_path.glob('*.json'), desc='Video Metadata'):
            video_id = json_file.stem
            metadata = load_json(str(json_file))
            if metadata and metadata.get('author') and metadata.get('publish_date'):
                self.video_metadata[video_id] = {'author': metadata['author'], 'publish_date': metadata['publish_date']}

    def load_keyframe_mappings(self):
        logger.info('Loading keyframe mappings...')
        map_path = self.settings.MAP_KEYFRAMES_PATH
        if not map_path.exists():
            logger.warning(f'Map keyframes path not found: {map_path}')
            return
        for csv_file in tqdm(map_path.glob('*.csv'), desc='Keyframe Mappings'):
            video_id = csv_file.stem
            df = load_csv(str(csv_file))
            if df is not None:
                self.keyframe_mappings[video_id] = df

    def load_object_detections(self):
        logger.info('Loading object detections...')
        objects_path = self.settings.OBJECTS_PATH
        if not objects_path.exists():
            logger.warning(f'Objects path not found: {objects_path}')
            return
        video_dirs = [d for d in objects_path.iterdir() if d.is_dir()]
        for video_dir in tqdm(video_dirs, desc='Object Detections'):
            video_id = video_dir.name
            self.object_detections[video_id] = {}
            for json_file in video_dir.glob('*.json'):
                keyframe_id = json_file.stem
                detection_data = load_json(str(json_file))
                if detection_data:
                    self.object_detections[video_id][keyframe_id] = detection_data
                    if 'detection_class_entities' in detection_data:
                        self.all_unique_objects.update(detection_data['detection_class_entities'])

    def get_all_keyframes(self) -> Set[Tuple[str, str]]:
        """Get all (video_id, keyframe_n) tuples in the dataset."""
        keyframes = set()
        for video_id, mappings in self.keyframe_mappings.items():
            for _, row in mappings.iterrows():
                keyframe_n = str(int(row['n']) + 1).zfill(3)
                keyframes.add((video_id, keyframe_n))
        return keyframes

    def get_keyframes_for_video(self, video_id: str) -> List[dict]:
        """Get all keyframes (id and index) for a specific video."""
        mapping_df = self.keyframe_mappings.get(video_id)
        if mapping_df is None:
            return []
        keyframes_data = [{'keyframe_id': str(int(row['n']) + 1).zfill(3), 'keyframe_index': int(row['frame_idx'])} for _, row in mapping_df.iterrows()]
        return keyframes_data

    def get_video_fps(self, video_id: str) -> Optional[float]:
        """
        Reads the FPS for a specific video from the cached keyframe mappings.
        """
        mapping_df = self.keyframe_mappings.get(video_id)
        if mapping_df is None:
            logger.warning(f'No keyframe mapping found for video_id: {video_id}')
            return
        try:
            if 'fps' in mapping_df.columns and (not mapping_df.empty):
                return float(mapping_df['fps'].iloc[0])
            logger.warning(f"'fps' column not found or mapping is empty for {video_id}")
            return
        except (ValueError, IndexError) as e:
            logger.error(f'Error extracting FPS for video {video_id}: {e}')
            return None