from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os
import httpx
from pathlib import Path

from generator import PWAGenerator

app = FastAPI(
    title="WaitLessQ PWA Generator",
    description="Dynamic PWA generation service",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files (only if directory exists)
static_dir = Path(__file__).parent / "static"
if static_dir.exists():
    app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")

# Initialize PWA generator
pwa_generator = PWAGenerator()

@app.get("/")
async def root():
    return {"message": "WaitLessQ PWA Generator", "version": "1.0.0"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

@app.post("/generate/{provider_id}")
async def generate_pwa(provider_id: int):
    """Generate PWA for a specific provider"""
    try:
        # Fetch provider data from main API
        backend_url = os.getenv("BACKEND_URL", "http://backend:8000")
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{backend_url}/api/v1/providers/{provider_id}")
            if response.status_code != 200:
                raise HTTPException(status_code=404, detail="Provider not found")
            
            provider_data = response.json()
            
            # Get PWA config
            pwa_response = await client.get(f"{backend_url}/api/v1/pwa/config/{provider_id}")
            pwa_config = pwa_response.json() if pwa_response.status_code == 200 else None
            
            # Generate PWA
            pwa_url = await pwa_generator.generate_pwa(provider_data, pwa_config)
            
            return {
                "provider_id": provider_id,
                "pwa_url": pwa_url,
                "status": "generated"
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/pwa/{provider_subdomain}")
async def serve_pwa(provider_subdomain: str):
    """Serve the generated PWA"""
    try:
        pwa_path = pwa_generator.get_pwa_path(provider_subdomain)
        if not pwa_path.exists():
            raise HTTPException(status_code=404, detail="PWA not found")
        
        return FileResponse(pwa_path / "index.html")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/pwa/{provider_subdomain}/{file_path:path}")
async def serve_pwa_file(provider_subdomain: str, file_path: str):
    """Serve PWA static files"""
    try:
        pwa_path = pwa_generator.get_pwa_path(provider_subdomain)
        file_path_obj = pwa_path / file_path
        
        if not file_path_obj.exists() or not file_path_obj.is_file():
            raise HTTPException(status_code=404, detail="File not found")
        
        return FileResponse(file_path_obj)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 