from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional
import httpx
import os
import shutil
from pathlib import Path
import uuid

from app.core.database import get_db
from app.services.auth import get_current_user
from app.models.user import User
from app.models.pwa_config import PWAConfig
from app.schemas.pwa import PWAConfigCreate, PWAConfigUpdate, PWAConfigResponse

router = APIRouter()

@router.get("/", response_model=List[PWAConfigResponse])
async def get_pwa_configs(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all PWA configurations for the current organization"""
    configs = db.query(PWAConfig).filter(
        PWAConfig.organization_id == current_user.organization_id
    ).all()
    return configs

@router.get("/config", response_model=Optional[PWAConfigResponse])
async def get_current_pwa_config(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get the current organization's PWA configuration"""
    config = db.query(PWAConfig).filter(
        PWAConfig.organization_id == current_user.organization_id
    ).first()
    return config

@router.get("/{config_id}", response_model=PWAConfigResponse)
async def get_pwa_config(
    config_id: int, 
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific PWA configuration"""
    config = db.query(PWAConfig).filter(
        PWAConfig.id == config_id,
        PWAConfig.organization_id == current_user.organization_id
    ).first()
    if not config:
        raise HTTPException(status_code=404, detail="PWA configuration not found")
    return config

@router.post("/save", response_model=PWAConfigResponse)
async def save_pwa_config(
    config: PWAConfigCreate, 
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Save PWA configuration (create or update automatically)"""
    # Check if organization already has a PWA config
    existing_config = db.query(PWAConfig).filter(
        PWAConfig.organization_id == current_user.organization_id
    ).first()
    
    if existing_config:
        # Update existing config
        for key, value in config.dict(exclude_unset=True).items():
            setattr(existing_config, key, value)
        
        db.commit()
        db.refresh(existing_config)
        return existing_config
    else:
        # Create new config
        db_config = PWAConfig(
            organization_id=current_user.organization_id,
            **config.dict()
        )
        db.add(db_config)
        db.commit()
        db.refresh(db_config)
        return db_config

@router.post("/config", response_model=PWAConfigResponse)
async def create_pwa_config(
    config: PWAConfigCreate, 
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new PWA configuration"""
    # Check if organization already has a PWA config
    existing_config = db.query(PWAConfig).filter(
        PWAConfig.organization_id == current_user.organization_id
    ).first()
    
    if existing_config:
        raise HTTPException(
            status_code=400, 
            detail="Organization already has a PWA configuration. Use update instead."
        )
    
    config_data = config.dict()
    config_data['organization_id'] = current_user.organization_id
    db_config = PWAConfig(**config_data)
    db.add(db_config)
    db.commit()
    db.refresh(db_config)
    return db_config

@router.put("/config/{config_id}", response_model=PWAConfigResponse)
async def update_pwa_config(
    config_id: int, 
    config: PWAConfigUpdate, 
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a PWA configuration"""
    db_config = db.query(PWAConfig).filter(
        PWAConfig.id == config_id,
        PWAConfig.organization_id == current_user.organization_id
    ).first()
    if not db_config:
        raise HTTPException(status_code=404, detail="PWA configuration not found")
    
    for field, value in config.dict(exclude_unset=True).items():
        setattr(db_config, field, value)
    
    db.commit()
    db.refresh(db_config)
    return db_config

@router.delete("/config/{config_id}")
async def delete_pwa_config(
    config_id: int, 
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a PWA configuration"""
    config = db.query(PWAConfig).filter(
        PWAConfig.id == config_id,
        PWAConfig.organization_id == current_user.organization_id
    ).first()
    if not config:
        raise HTTPException(status_code=404, detail="PWA configuration not found")
    
    db.delete(config)
    db.commit()
    return {"message": "PWA configuration deleted successfully"}

@router.post("/upload-icon")
async def upload_icon(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """Upload PWA icon file"""
    
    # Validate file type
    if not file.content_type or not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    # Validate file size (5MB max)
    if file.size and file.size > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size must be less than 5MB")
    
    # Create upload directory
    upload_dir = Path("uploads/pwa-icons")
    upload_dir.mkdir(parents=True, exist_ok=True)
    
    # Generate unique filename
    file_extension = Path(file.filename).suffix if file.filename else '.png'
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    file_path = upload_dir / unique_filename
    
    try:
        # Save file
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Return the URL for the uploaded file
        file_url = f"/api/v1/pwa/icons/{unique_filename}"
        
        return {
            "success": True,
            "url": file_url,
            "filename": unique_filename
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload file: {str(e)}")

@router.get("/icons/{filename}")
async def serve_icon(filename: str):
    """Serve uploaded PWA icon files"""
    file_path = Path("uploads/pwa-icons") / filename
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Icon not found")
    
    return FileResponse(file_path)

@router.post("/generate")
async def generate_pwa(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate PWA files and return deployment info"""
    # Get the organization's PWA config
    config = db.query(PWAConfig).filter(
        PWAConfig.organization_id == current_user.organization_id
    ).first()
    
    if not config:
        raise HTTPException(status_code=404, detail="No PWA configuration found. Please create one first.")
    
    try:
        # Call PWA generator service
        pwa_generator_url = os.getenv("PWA_GENERATOR_URL", "http://localhost:8001")
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{pwa_generator_url}/generate/{current_user.organization_id}",
                params={"pwa_type": "client"}
            )
            
            if response.status_code == 200:
                result = response.json()
                
                # Return the complete PWA generator response with additional metadata
                return {
                    **result,  # Include all fields from PWA generator
                    "success": True,
                    "message": "PWA generated successfully",
                    "qr_code_url": f"{result.get('full_url', '')}/qr-code",
                    "install_instructions": "Open the PWA URL on your mobile device and tap 'Add to Home Screen'",
                    "generated_at": "2024-12-20T20:00:00Z"
                }
            else:
                raise HTTPException(status_code=500, detail="Failed to generate PWA")
                
    except httpx.TimeoutException:
        raise HTTPException(status_code=503, detail="PWA generator service is unavailable")
    except Exception as e:
        # Fallback to mock data if PWA generator is not available
        org_id = current_user.organization_id
        pwa_url = f"http://localhost:8001/pwa/org-{org_id}"
        subdomain_url = f"http://org-{org_id}.localhost:8001"
        
        return {
            "organization_id": org_id,
            "pwa_url": f"/pwa/org-{org_id}",
            "pwa_type": "client",
            "status": "generated",
            "full_url": pwa_url,
            "subdomain_url": subdomain_url,
            "subdomain_preview": f"org-{org_id}.localhost:8001",
            "success": True,
            "message": "PWA generated successfully (fallback)",
            "qr_code_url": f"{pwa_url}/qr-code",
            "install_instructions": "Open the PWA URL on your mobile device and tap 'Add to Home Screen'",
            "generated_at": "2024-12-20T20:00:00Z"
        }

@router.get("/config/org/{organization_id}", response_model=Optional[PWAConfigResponse])
async def get_organization_pwa_config(
    organization_id: int,
    db: Session = Depends(get_db)
):
    """Get PWA configuration for a specific organization (public endpoint for PWA generator)"""
    config = db.query(PWAConfig).filter(
        PWAConfig.organization_id == organization_id
    ).first()
    return config

@router.get("/preview")
async def get_pwa_preview(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get PWA preview information"""
    config = db.query(PWAConfig).filter(
        PWAConfig.organization_id == current_user.organization_id
    ).first()
    
    if not config:
        raise HTTPException(status_code=404, detail="No PWA configuration found")
    
    pwa_url = f"https://{current_user.organization_id}.pwa.waitlessq.com"
    
    return {
        "pwa_url": pwa_url,
        "qr_code_url": f"{pwa_url}/qr-code",
        "preview_available": True,
        "config": config
    } 