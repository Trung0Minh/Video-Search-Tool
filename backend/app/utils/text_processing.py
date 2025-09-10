# Decompiled with PyLingual (https://pylingual.io)
# Internal filename: d:\AIC\video_retrieval_project\utils\text_processing.py
# Bytecode version: 3.11a7e (3495)
# Source timestamp: 2025-08-24 13:39:03 UTC (1756042743)

import re
from typing import List, Set
import unicodedata

def normalize_text(text: str) -> str:
    """Normalize Vietnamese text"""
    if not text:
        return ''
    text = unicodedata.normalize('NFC', text)
    text = text.lower()
    text = re.sub('\\s+', ' ', text.strip())
    return text

def extract_keywords(text: str) -> List[str]:
    """Extract keywords from text"""
    if not text:
        return []
    text = normalize_text(text)
    words = re.findall('\\b\\w+\\b', text)
    stop_words = {'với', 'này', 'cho', 'các', 'một', 'và', 'từ', 'đó', 'trong', 'về', 'có', 'để', 'của', 'là'}
    keywords = [word for word in words if len(word) > 2 and word not in stop_words]
    return list(set(keywords))