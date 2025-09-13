import json
import pandas as pd
import numpy as np
from typing import Dict, Any, Optional
import requests
from io import StringIO

def load_json(file_path: str) -> Optional[Dict[str, Any]]:
    """Load JSON file safely from URL with custom User-Agent."""
    headers = {"User-Agent": "Mozilla/5.0"}  # fake browser user-agent
    try:
        response = requests.get(file_path, headers=headers)
        response.raise_for_status()
        return response.json()
    except (requests.RequestException, json.JSONDecodeError) as e:
        print(f'Error loading {file_path}: {e}')
        return None

def load_csv(file_path: str) -> Optional[pd.DataFrame]:
    """Load CSV file safely."""
    headers = {"User-Agent": "Mozilla/5.0"}
    try:
        response = requests.get(file_path, headers=headers)
        response.raise_for_status()
        return pd.read_csv(StringIO(response.text))
    except Exception as e:
        print(f'Error loading {file_path}: {e}')

def load_npy(file_path: str) -> Optional[np.ndarray]:
    """Load NPY file safely."""
    try:
        return np.load(file_path)
    except Exception as e:
        print(f'Error loading {file_path}: {e}')