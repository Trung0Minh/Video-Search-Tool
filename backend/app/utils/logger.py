# Decompiled with PyLingual (https://pylingual.io)
# Internal filename: D:\AIC\video_retrieval_project\backend\app\utils\logger.py
# Bytecode version: 3.11a7e (3495)
# Source timestamp: 2025-09-08 08:32:28 UTC (1757320348)

import logging
import sys

def setup_logger(name: str, level: int=logging.INFO):
    """Setup logger with console output."""
    logger = logging.getLogger(name)
    logger.setLevel(level)
    if logger.handlers:
        return logger
    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)
    return logger