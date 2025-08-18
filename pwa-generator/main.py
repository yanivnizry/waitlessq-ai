from fastapi import FastAPI, HTTPException, Request
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

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

def extract_org_subdomain(request: Request) -> str:
    """Extract organization subdomain from request"""
    host = request.headers.get("host", "")
    
    # Handle localhost development with port
    if "localhost:" in host:
        # For localhost:8001, check for org subdomain pattern like org-1.localhost:8001
        if host.startswith("org-"):
            return host.split(".")[0]  # Extract "org-1" from "org-1.localhost:8001"
    else:
        # For production domains like org-1.waitlessq.com
        parts = host.split(".")
        if len(parts) >= 2 and parts[0].startswith("org-"):
            return parts[0]  # Extract "org-1" from "org-1.waitlessq.com"
    
    return None

@app.get("/")
async def serve_subdomain_pwa(request: Request):
    """Serve PWA based on subdomain or show generator info"""
    org_subdomain = extract_org_subdomain(request)
    
    if not org_subdomain:
        return {
            "message": "WaitLessQ PWA Generator", 
            "version": "1.0.0",
            "note": "Use org-{id}.localhost:8001 or /pwa/org-{id} to access PWAs"
        }
    
    try:
        pwa_path = pwa_generator.get_pwa_path(org_subdomain)
        if not pwa_path.exists():
            raise HTTPException(status_code=404, detail=f"PWA not found for {org_subdomain}")
        
        return FileResponse(pwa_path / "index.html")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/generate/{organization_id}")
async def generate_pwa(organization_id: int, pwa_type: str = "client"):
    """Generate PWA for a specific organization"""
    try:
        # Fetch organization data from main API
        backend_url = os.getenv("BACKEND_URL", "http://backend:8000")
        async with httpx.AsyncClient() as client:
            # Get organization data
            response = await client.get(f"{backend_url}/api/v1/organizations/{organization_id}")
            if response.status_code != 200:
                raise HTTPException(status_code=404, detail="Organization not found")
            
            organization_data = response.json()
            
            # Get PWA config for this organization
            pwa_response = await client.get(f"{backend_url}/api/v1/pwa/config/org/{organization_id}")
            pwa_config = pwa_response.json() if pwa_response.status_code == 200 else None
            
            # Parse JSON strings in PWA config
            if pwa_config:
                import json
                # Parse features JSON string to object
                if isinstance(pwa_config.get("features"), str):
                    try:
                        pwa_config["features"] = json.loads(pwa_config["features"])
                    except (json.JSONDecodeError, TypeError):
                        pwa_config["features"] = {}
                
                # Parse branding JSON string to object  
                if isinstance(pwa_config.get("branding"), str):
                    try:
                        pwa_config["branding"] = json.loads(pwa_config["branding"])
                    except (json.JSONDecodeError, TypeError):
                        pwa_config["branding"] = {}
                        
                # Parse other JSON fields that might be strings
                json_fields = ["custom_menu_items", "push_notification_settings", "supported_languages"]
                for field in json_fields:
                    if isinstance(pwa_config.get(field), str):
                        try:
                            pwa_config[field] = json.loads(pwa_config[field])
                        except (json.JSONDecodeError, TypeError):
                            pwa_config[field] = None
            
            # Create provider data structure for compatibility
            provider_data = {
                "id": organization_id,
                "organization_id": organization_id,
                "business_name": organization_data.get("name", "WaitLessQ"),
                "pwa_subdomain": f"org-{organization_id}",
                "primary_color": "#3B82F6",
                "secondary_color": "#1F2937"
            }
            
            # Generate PWA
            pwa_url = await pwa_generator.generate_pwa(provider_data, pwa_config, pwa_type)
            
            # Generate subdomain URLs
            org_subdomain = f"org-{organization_id}"
            subdomain_url = f"http://{org_subdomain}.localhost:8001"
            
            return {
                "organization_id": organization_id,
                "pwa_url": pwa_url,
                "pwa_type": pwa_type,
                "status": "generated",
                "full_url": f"{backend_url}{pwa_url}",
                "subdomain_url": subdomain_url,
                "subdomain_preview": f"{org_subdomain}.localhost:8001"
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/generate/provider/{provider_id}")
async def generate_provider_pwa(provider_id: int, pwa_type: str = "basic"):
    """Generate PWA for a specific provider (legacy endpoint)"""
    try:
        # Fetch provider data from main API
        backend_url = os.getenv("BACKEND_URL", "http://backend:8000")
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{backend_url}/api/v1/providers/{provider_id}")
            if response.status_code != 200:
                raise HTTPException(status_code=404, detail="Provider not found")
            
            provider_data = response.json()
            provider_data["pwa_subdomain"] = f"provider-{provider_id}"
            
            # Get PWA config
            pwa_response = await client.get(f"{backend_url}/api/v1/pwa/config")
            pwa_config = pwa_response.json() if pwa_response.status_code == 200 else None
            
            # Generate PWA
            pwa_url = await pwa_generator.generate_pwa(provider_data, pwa_config, pwa_type)
            
            return {
                "provider_id": provider_id,
                "pwa_url": pwa_url,
                "pwa_type": pwa_type,
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
        
        # Handle empty file_path (trailing slash case) - serve index.html
        if not file_path or file_path == "":
            file_path_obj = pwa_path / "index.html"
        else:
            file_path_obj = pwa_path / file_path
        
        if not file_path_obj.exists() or not file_path_obj.is_file():
            raise HTTPException(status_code=404, detail="File not found")
        
        return FileResponse(file_path_obj)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Catch-all route for subdomain PWA files - MUST be last
@app.get("/{file_path:path}", include_in_schema=False)
async def serve_subdomain_pwa_files(request: Request, file_path: str):
    """Serve PWA static files based on subdomain"""
    org_subdomain = extract_org_subdomain(request)
    
    if not org_subdomain:
        raise HTTPException(status_code=404, detail="No organization subdomain found")
    
    try:
        pwa_path = pwa_generator.get_pwa_path(org_subdomain)
        
        # Handle empty file_path or serve index.html for SPA routing
        if not file_path or file_path == "" or not "." in file_path:
            file_path_obj = pwa_path / "index.html"
        else:
            file_path_obj = pwa_path / file_path
        
        if not file_path_obj.exists() or not file_path_obj.is_file():
            # For SPA routing, serve index.html for unknown routes
            if not "." in file_path:
                file_path_obj = pwa_path / "index.html"
                if file_path_obj.exists():
                    return FileResponse(file_path_obj)
            raise HTTPException(status_code=404, detail="File not found")
        
        return FileResponse(file_path_obj)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001) 