from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
import re
from datetime import datetime

from app.core.database import get_db
from app.models.provider import Provider
from app.models.user import User
from app.schemas.provider import ProviderCreate, ProviderUpdate, ProviderResponse
from app.services.auth import get_current_user

router = APIRouter()

def validate_email(email: str) -> bool:
    """Validate email format"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None

def validate_phone(phone: str) -> bool:
    """Validate phone number format"""
    if not phone:
        return True  # Phone is optional
    # Remove all non-digit characters
    digits_only = re.sub(r'\D', '', phone)
    return len(digits_only) >= 10

def sanitize_string(value: str) -> str:
    """Sanitize string input"""
    if not value:
        return value
    # Remove potentially dangerous characters
    return re.sub(r'[<>"\']', '', value.strip())

def validate_business_name(name: str) -> tuple[bool, str]:
    """Validate business name"""
    if not name or len(name.strip()) < 2:
        return False, "Business name must be at least 2 characters long"
    
    if len(name) > 100:
        return False, "Business name must be less than 100 characters"
    
    return True, ""

def validate_address(address: str) -> tuple[bool, str]:
    """Validate address"""
    if not address:
        return True, ""  # Address is optional
    
    if len(address) > 200:
        return False, "Address must be less than 200 characters"
    
    return True, ""

@router.get("/", response_model=List[ProviderResponse])
async def get_providers(
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all providers with optional search and pagination"""
    
    # Validate pagination parameters
    if skip < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Skip parameter must be non-negative"
        )
    
    if limit < 1 or limit > 1000:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Limit must be between 1 and 1000"
        )
    
    # Sanitize search parameter
    if search:
        search = sanitize_string(search)
        if len(search) < 2:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Search term must be at least 2 characters"
            )
    
    try:
        query = db.query(Provider)
        
        if search:
            query = query.filter(
                Provider.business_name.ilike(f"%{search}%") |
                Provider.contact_email.ilike(f"%{search}%")
            )
        
        providers = query.offset(skip).limit(limit).all()
        return providers
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch providers"
        )

@router.get("/{provider_id}", response_model=ProviderResponse)
async def get_provider(
    provider_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific provider by ID"""
    
    # Validate provider_id
    if provider_id <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Provider ID must be positive"
        )
    
    try:
        provider = db.query(Provider).filter(Provider.id == provider_id).first()
        if not provider:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Provider not found"
            )
        return provider
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch provider"
        )

@router.post("/", response_model=ProviderResponse)
async def create_provider(
    provider_data: ProviderCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new provider"""
    
    # Validate business name
    is_valid, error_message = validate_business_name(provider_data.business_name)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_message
        )
    
    # Validate email
    if not validate_email(provider_data.contact_email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid email format"
        )
    
    # Validate phone
    if provider_data.contact_phone and not validate_phone(provider_data.contact_phone):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid phone number format"
        )
    
    # Validate address
    if provider_data.address:
        is_valid, error_message = validate_address(provider_data.address)
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error_message
            )
    
    # Check if provider with same email already exists
    existing_provider = db.query(Provider).filter(
        Provider.contact_email == provider_data.contact_email
    ).first()
    
    if existing_provider:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Provider with this email already exists"
        )
    
    try:
        # Sanitize input data
        provider = Provider(
            business_name=sanitize_string(provider_data.business_name),
            contact_email=provider_data.contact_email.lower().strip(),
            contact_phone=sanitize_string(provider_data.contact_phone) if provider_data.contact_phone else None,
            address=sanitize_string(provider_data.address) if provider_data.address else None,
            services=provider_data.services,
            operating_hours=provider_data.operating_hours,
            is_active=True,
            created_by=current_user.id
        )
        
        db.add(provider)
        db.commit()
        db.refresh(provider)
        return provider
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create provider"
        )

@router.put("/{provider_id}", response_model=ProviderResponse)
async def update_provider(
    provider_id: int,
    provider_data: ProviderUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a provider"""
    
    # Validate provider_id
    if provider_id <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Provider ID must be positive"
        )
    
    # Find existing provider
    provider = db.query(Provider).filter(Provider.id == provider_id).first()
    if not provider:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Provider not found"
        )
    
    # Validate business name if provided
    if provider_data.business_name is not None:
        is_valid, error_message = validate_business_name(provider_data.business_name)
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error_message
            )
    
    # Validate email if provided
    if provider_data.contact_email is not None:
        if not validate_email(provider_data.contact_email):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid email format"
            )
        
        # Check if email is already used by another provider
        existing_provider = db.query(Provider).filter(
            Provider.contact_email == provider_data.contact_email,
            Provider.id != provider_id
        ).first()
        
        if existing_provider:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email is already used by another provider"
            )
    
    # Validate phone if provided
    if provider_data.contact_phone is not None and not validate_phone(provider_data.contact_phone):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid phone number format"
        )
    
    # Validate address if provided
    if provider_data.address is not None:
        is_valid, error_message = validate_address(provider_data.address)
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error_message
            )
    
    try:
        # Update fields
        update_data = provider_data.dict(exclude_unset=True)
        
        # Sanitize string fields
        if 'business_name' in update_data:
            update_data['business_name'] = sanitize_string(update_data['business_name'])
        if 'contact_email' in update_data:
            update_data['contact_email'] = update_data['contact_email'].lower().strip()
        if 'contact_phone' in update_data:
            update_data['contact_phone'] = sanitize_string(update_data['contact_phone'])
        if 'address' in update_data:
            update_data['address'] = sanitize_string(update_data['address'])
        
        for field, value in update_data.items():
            setattr(provider, field, value)
        
        provider.updated_at = datetime.utcnow()
        
        db.commit()
        db.refresh(provider)
        return provider
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update provider"
        )

@router.delete("/{provider_id}")
async def delete_provider(
    provider_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a provider"""
    
    # Validate provider_id
    if provider_id <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Provider ID must be positive"
        )
    
    # Find existing provider
    provider = db.query(Provider).filter(Provider.id == provider_id).first()
    if not provider:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Provider not found"
        )
    
    try:
        db.delete(provider)
        db.commit()
        return {"message": "Provider deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete provider"
        ) 