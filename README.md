# Video Retrieval System

This project is a video retrieval system that allows users to search for videos using text queries, image queries, and various filters. The system is built with a React frontend and a Python FastAPI backend, using Weaviate for vector search and CLIP for multimodal embeddings.

## Features

- **Text-based Search**: Search for videos using natural language queries.
- **Multimodal Search**: Utilizes CLIP for powerful text-to-video retrieval.
- **Vietnamese Search**: Supports Vietnamese language queries through Weaviate's hybrid search.
- **Filtering**: Filter search results by packs, videos, and excluded videos.
- **Interactive UI**: A user-friendly web interface to view and interact with search results.
- **Keyframe Navigation**: View and jump to specific keyframes within a video.
- **Dockerized**: The entire application can be run using Docker Compose for easy setup and deployment.

## Tech Stack

- **Frontend**: React (with Solid.js), Vite, Tailwind CSS
- **Backend**: Python, FastAPI
- **Vector Database**: Weaviate
- **Machine Learning**: PyTorch, CLIP, Sentence-Transformers

## Prerequisites

Before you begin, ensure you have the following installed:

- [Python](https://www.python.org/downloads/) (3.11+)
- [Node.js](https://nodejs.org/en/download/) (18+)
- [Docker](https://www.docker.com/products/docker-desktop/)

## Installation

1.  **Clone the repository:**

    ```bash
    git clone <repository-url>
    cd video_retrieval_project
    ```

2.  **Install backend dependencies:**

    ```bash
    pip install -r backend/requirements.txt
    ```

3.  **Install frontend dependencies:**

    ```bash
    cd frontend
    npm install
    cd ..
    ```

## Data Preparation

1.  **Place your data** in the `data` directory. The project expects the following structure:

    ```
    data/
    ├── clip-features-32/
    ├── fused-data/
    ├── keyframes/
    ├── map-keyframes/
    ├── media-info/
    ├── objects/
    └── video/
    ```
    Or if you are storing data online (HuggingFace just like me). Go to `backend/config.py` for settings. 

2.  **Run the data loading and indexing script:**

    This script will process your data and index it into the Weaviate vector database.

    ```bash
    python backend/app/builder/run_all.py
    ```

## Running the Application

You can run the application in two ways:

### Option 1: Using Docker (Recommended for production-like environment)

This will start the backend server, the frontend server, and the Weaviate database.

```bash
docker-compose up --build
```

### Option 2: Local Development

This will run the backend and frontend servers locally without Docker.

```bash
python launch.py
```

## Accessing the Application

Once the application is running, you can access the frontend in your web browser at:

[http://localhost:5173](http://localhost:5173)
