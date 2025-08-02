from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from backend.app.core.database import get_db
from backend.app.models.provider import Provider
from backend.app.schemas.provider import ProviderCreate, ProviderUpdate, ProviderResponse

router = APIRouter()

@router.get("/", response_model=List[ProviderResponse])
async def get_providers(db: Session = Depends(get_db)):
    """Get all providers"""
    providers = db.query(Provider).all()
    return providers

@router.get("/{provider_id}", response_model=ProviderResponse)
async def get_provider(provider_id: int, db: Session = Depends(get_db)):
    """Get a specific provider"""
    provider = db.query(Provider).filter(Provider.id == provider_id).first()
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")
    return provider

@router.post("/", response_model=ProviderResponse)
async def create_provider(provider: ProviderCreate, db: Session = Depends(get_db)):
    """Create a new provider"""
    db_provider = Provider(**provider.dict())
    db.add(db_provider)
    db.commit()
    db.refresh(db_provider)
    return db_provider

@router.put("/{provider_id}", response_model=ProviderResponse)
async def update_provider(provider_id: int, provider: ProviderUpdate, db: Session = Depends(get_db)):
    """Update a provider"""
    db_provider = db.query(Provider).filter(Provider.id == provider_id).first()
    if not db_provider:
        raise HTTPException(status_code=404, detail="Provider not found")
    
    for field, value in provider.dict(exclude_unset=True).items():
        setattr(db_provider, field, value)
    
    db.commit()
    db.refresh(db_provider)
    return db_provider

@router.delete("/{provider_id}")
async def delete_provider(provider_id: int, db: Session = Depends(get_db)):
    """Delete a provider"""
    provider = db.query(Provider).filter(Provider.id == provider_id).first()
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")
    
    db.delete(provider)
    db.commit()
    return {"message": "Provider deleted successfully"} 