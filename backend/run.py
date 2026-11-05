import uvicorn
import os
import sys

# Ensure backend directory is in python path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    host = os.getenv("HOST", "0.0.0.0")
    print(f"Starting ORCA Marine Reasoning Backend on http://{host}:{port}")
    print(f"Interactive Swagger Documentation: http://{host}:{port}/docs")
    uvicorn.run("app.main:app", host=host, port=port, reload=True)
