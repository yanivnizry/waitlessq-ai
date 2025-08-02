from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime

class ProviderCreate(BaseModel):
    business_name: str
    business_description: Optional[str] = None
    business_type: Optional[str] = None
    phone: Optional[str] = None
    website: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    country: Optional[str] = None
    business_hours: Optional[Dict[str, Any]] = None
    accepts_walk_ins: bool = True
    max_queue_size: int = 50
    appointment_duration: int = 30
    buffer_time: int = 15
    logo_url: Optional[str] = None
    primary_color: str = "#3B82F6"
    secondary_color: str = "#1F2937"
    pwa_subdomain: Optional[str] = None
    custom_domain: Optional[str] = None

class ProviderUpdate(BaseModel):
    business_name: Optional[str] = None
    business_description: Optional[str] = None
    business_type: Optional[str] = None
    phone: Optional[str] = None
    website: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    country: Optional[str] = None
    business_hours: Optional[Dict[str, Any]] = None
    accepts_walk_ins: Optional[bool] = None
    max_queue_size: Optional[int] = None
    appointment_duration: Optional[int] = None
    buffer_time: Optional[int] = None
    logo_url: Optional[str] = None
    primary_color: Optional[str] = None
    secondary_color: Optional[str] = None
    pwa_subdomain: Optional[str] = None
    custom_domain: Optional[str] = None

class ProviderResponse(BaseModel):
    id: int
    user_id: int
    business_name: str
    business_description: Optional[str] = None
    business_type: Optional[str] = None
    phone: Optional[str] = None
    website: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    country: Optional[str] = None
    business_hours: Optional[Dict[str, Any]] = None
    is_active: bool
    accepts_walk_ins: bool
    max_queue_size: int
    appointment_duration: int
    buffer_time: int
    logo_url: Optional[str] = None
    primary_color: str
    secondary_color: str
    pwa_subdomain: Optional[str] = None
    custom_domain: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True 