import subprocess
import time
import webbrowser
from pathlib import Path
import sys
import requests

def wait_for_backend(url: str, timeout: int = 100):
    """
    Polls the backend health check endpoint until it's ready or times out.
    """
    print("\n>>> Waiting for backend to be ready...")
    start_time = time.time()
    while time.time() - start_time < timeout:
        try:
            response = requests.get(url)
            if response.status_code == 200:
                print(">>> Backend is ready!")
                return True
        except requests.ConnectionError:
            # Server is not up yet, wait and try again
            pass
        time.sleep(1)
    
    print(f"[ERROR] Backend did not become ready within {timeout} seconds.")
    return False

def main():
    """
    Launches the backend and frontend servers and opens the browser.
    """
    print("=================================================")
    print("Video Retrieval System - Integrated Launcher")
    print("=================================================")

    project_dir = Path(__file__).resolve().parent
    backend_dir = project_dir / "backend"
    frontend_dir = project_dir / "frontend"
    
    backend_command = [sys.executable, "main.py"]
    frontend_command = ["npm", "run", "dev"]

    backend_stdout_log = project_dir / "backend_stdout.log"
    backend_stderr_log = project_dir / "backend_stderr.log"

    try:
        # --- Start Backend & Frontend ---
        print(f"\n>>> Starting backend server from: {backend_dir}")
        print(f">>> Backend output is being logged to: {backend_stdout_log} and {backend_stderr_log}")
        with open(backend_stdout_log, 'wb') as out, open(backend_stderr_log, 'wb') as err:
            backend_process = subprocess.Popen(
                backend_command, cwd=backend_dir, shell=sys.platform == "win32",
                stdout=out, stderr=err
            )

        print(f"\n>>> Starting frontend server from: {frontend_dir}")
        frontend_process = subprocess.Popen(
            frontend_command, cwd=frontend_dir, shell=True
        )

        # --- Wait for Backend to be Ready ---
        backend_health_url = "http://localhost:8000/api/health"
        if wait_for_backend(backend_health_url):
            # --- Open Browser ---
            frontend_url = "http://localhost:5173" 
            print(f">>> Opening frontend at {frontend_url} in your browser...")
            try:
                webbrowser.open(frontend_url)
            except Exception as e:
                print(f"[Warning] Could not automatically open browser: {e}")
                print(f"Please manually open this URL: {frontend_url}")
        else:
            print(">>> Skipping browser launch due to backend startup failure.")
            if backend_stderr_log.exists():
                print("\n" + "="*20 + " BACKEND ERROR LOG " + "="*20)
                print(backend_stderr_log.read_text())
                print("="*59)


        print("\nSystem launch sequence complete.")
        print("To stop the system, press Ctrl+C in this terminal.")
        
        frontend_process.wait()
        backend_process.wait()

    except KeyboardInterrupt:
        print("\n>>> Shutting down servers...")
    except FileNotFoundError as e:
        print(f"\n[ERROR] Command not found: {e.filename}.")
        print("Please ensure Python and Node.js/npm are installed and in your system's PATH.")
    finally:
        if 'backend_process' in locals() and backend_process.poll() is None:
            backend_process.terminate()
        if 'frontend_process' in locals() and frontend_process.poll() is None:
            frontend_process.terminate()
        print(">>> System has been shut down.")

if __name__ == "__main__":
    main()
