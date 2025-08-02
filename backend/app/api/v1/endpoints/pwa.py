from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from backend.app.core.database import get_db
from backend.app.models.pwa_config import PWAConfig
from backend.app.schemas.pwa import PWAConfigCreate, PWAConfigUpdate, PWAConfigResponse

router = APIRouter()

@router.get("/", response_model=List[PWAConfigResponse])
async def get_pwa_configs(db: Session = Depends(get_db)):
    """Get all PWA configurations"""
    configs = db.query(PWAConfig).all()
    return configs

@router.get("/{config_id}", response_model=PWAConfigResponse)
async def get_pwa_config(config_id: int, db: Session = Depends(get_db)):
    """Get a specific PWA configuration"""
    config = db.query(PWAConfig).filter(PWAConfig.id == config_id).first()
    if not config:
        raise HTTPException(status_code=404, detail="PWA configuration not found")
    return config

@router.post("/", response_model=PWAConfigResponse)
async def create_pwa_config(config: PWAConfigCreate, db: Session = Depends(get_db)):
    """Create a new PWA configuration"""
    db_config = PWAConfig(**config.dict())
    db.add(db_config)
    db.commit()
    db.refresh(db_config)
    return db_config

@router.put("/{config_id}", response_model=PWAConfigResponse)
async def update_pwa_config(config_id: int, config: PWAConfigUpdate, db: Session = Depends(get_db)):
    """Update a PWA configuration"""
    db_config = db.query(PWAConfig).filter(PWAConfig.id == config_id).first()
    if not db_config:
        raise HTTPException(status_code=404, detail="PWA configuration not found")
    
    for field, value in config.dict(exclude_unset=True).items():
        setattr(db_config, field, value)
    
    db.commit()
    db.refresh(db_config)
    return db_config

@router.delete("/{config_id}")
async def delete_pwa_config(config_id: int, db: Session = Depends(get_db)):
    """Delete a PWA configuration"""
    config = db.query(PWAConfig).filter(PWAConfig.id == config_id).first()
    if not config:
        raise HTTPException(status_code=404, detail="PWA configuration not found")
    
    db.delete(config)
    db.commit()
    return {"message": "PWA configuration deleted successfully"} 