from pydantic import BaseModel, Field, validator
from typing import Optional
from datetime import datetime

class ServiceBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    category: Optional[str] = Field(None, max_length=100)
    duration: int = Field(..., ge=5, le=480)  # 5 minutes to 8 hours
    price: float = Field(..., ge=0.0)
    is_active: bool = True
    requires_approval: bool = False
    max_advance_booking_days: int = Field(30, ge=1, le=365)
    buffer_time_before: int = Field(0, ge=0, le=60)
    buffer_time_after: int = Field(0, ge=0, le=60)
    is_online_bookable: bool = True
    max_slots_per_day: Optional[int] = Field(None, ge=1)
    preparation_instructions: Optional[str] = None
    cancellation_policy: Optional[str] = None
    provider_id: Optional[int] = None

    @validator('name')
    def validate_name(cls, v):
        if not v or not v.strip():
            raise ValueError('Service name cannot be empty')
        return v.strip()

    @validator('category')
    def validate_category(cls, v):
        if v:
            allowed_categories = [
                'consultation', 'treatment', 'examination', 'therapy', 
                'check-up', 'follow-up', 'emergency', 'procedure', 'other'
            ]
            if v.lower() not in allowed_categories:
                raise ValueError(f'Category must be one of: {", ".join(allowed_categories)}')
            return v.lower()
        return v

    @validator('price')
    def validate_price(cls, v):
        if v < 0:
            raise ValueError('Price cannot be negative')
        # Round to 2 decimal places
        return round(v, 2)

class ServiceCreate(ServiceBase):
    pass

class ServiceUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    category: Optional[str] = Field(None, max_length=100)
    duration: Optional[int] = Field(None, ge=5, le=480)
    price: Optional[float] = Field(None, ge=0.0)
    is_active: Optional[bool] = None
    requires_approval: Optional[bool] = None
    max_advance_booking_days: Optional[int] = Field(None, ge=1, le=365)
    buffer_time_before: Optional[int] = Field(None, ge=0, le=60)
    buffer_time_after: Optional[int] = Field(None, ge=0, le=60)
    is_online_bookable: Optional[bool] = None
    max_slots_per_day: Optional[int] = Field(None, ge=1)
    preparation_instructions: Optional[str] = None
    cancellation_policy: Optional[str] = None
    provider_id: Optional[int] = None

    @validator('name')
    def validate_name(cls, v):
        if v is not None:
            if not v or not v.strip():
                raise ValueError('Service name cannot be empty')
            return v.strip()
        return v

    @validator('category')
    def validate_category(cls, v):
        if v is not None:
            allowed_categories = [
                'consultation', 'treatment', 'examination', 'therapy', 
                'check-up', 'follow-up', 'emergency', 'procedure', 'other'
            ]
            if v.lower() not in allowed_categories:
                raise ValueError(f'Category must be one of: {", ".join(allowed_categories)}')
            return v.lower()
        return v

    @validator('price')
    def validate_price(cls, v):
        if v is not None:
            if v < 0:
                raise ValueError('Price cannot be negative')
            return round(v, 2)
        return v

class ServiceResponse(ServiceBase):
    id: int
    organization_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    # Additional computed fields
    provider_name: Optional[str] = None
    total_appointments: int = 0
    
    class Config:
        from_attributes = True

class ServiceListResponse(BaseModel):
    services: list[ServiceResponse]
    total: int
    page: int
    per_page: int
    total_pages: int

class ServiceStats(BaseModel):
    total_services: int
    active_services: int
    inactive_services: int
    avg_price: float
    avg_duration: int
    most_popular_category: Optional[str] = None