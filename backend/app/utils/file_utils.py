# Decompiled with PyLingual (https://pylingual.io)
# Internal filename: D:\AIC\video_retrieval_project\backend\app\utils\file_utils.py
# Bytecode version: 3.11a7e (3495)
# Source timestamp: 2025-09-08 08:32:38 UTC (1757320358)

import json
import pandas as pd
import numpy as np
from typing import Dict, Any, Optional

def load_json(file_path: str) -> Optional[Dict[str, Any]]:
    """Load JSON file safely."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except (IOError, json.JSONDecodeError) as e:
        print(f'Error loading {file_path}: {e}')
        return None

def load_csv(file_path: str) -> Optional[pd.DataFrame]:
    """Load CSV file safely."""
    try:
        return pd.read_csv(file_path)
    except Exception as e:
        print(f'Error loading {file_path}: {e}')

def load_npy(file_path: str) -> Optional[np.ndarray]:
    """Load NPY file safely."""
    try:
        return np.load(file_path)
    except Exception as e:
        print(f'Error loading {file_path}: {e}')