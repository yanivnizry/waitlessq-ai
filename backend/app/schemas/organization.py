from pydantic import BaseModel, EmailStr, HttpUrl
from typing import Optional, Dict, Any
from datetime import datetime
from enum import Enum

class UserRole(str, Enum):
    OWNER = "owner"
    ADMIN = "admin"
    MANAGER = "manager"
    STAFF = "staff"
    VIEWER = "viewer"

class PlanType(str, Enum):
    BASIC = "basic"
    PRO = "pro"
    ENTERPRISE = "enterprise"

class OrganizationBase(BaseModel):
    name: str
    slug: str
    description: Optional[str] = None
    contact_email: Optional[EmailStr] = None
    contact_phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    country: Optional[str] = None
    subdomain: Optional[str] = None
    custom_domain: Optional[str] = None
    plan_type: PlanType = PlanType.BASIC
    max_providers: int = 5
    max_users: int = 20
    max_storage_gb: int = 10
    logo_url: Optional[HttpUrl] = None
    primary_color: str = "#3B82F6"
    secondary_color: str = "#1F2937"
    favicon_url: Optional[HttpUrl] = None
    features: Dict[str, Any] = {
        "appointments": True,
        "queues": True,
        "pwa": True,
        "analytics": False,
        "integrations": False,
        "custom_branding": False,
        "api_access": False
    }
    settings: Dict[str, Any] = {
        "timezone": "UTC",
        "date_format": "MM/DD/YYYY",
        "time_format": "12h",
        "language": "en",
        "notifications": {
            "email": True,
            "sms": False,
            "push": True
        },
        "privacy": {
            "data_retention_days": 365,
            "gdpr_compliant": False
        }
    }

class OrganizationCreate(OrganizationBase):
    pass

class OrganizationUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    contact_email: Optional[EmailStr] = None
    contact_phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    country: Optional[str] = None
    subdomain: Optional[str] = None
    custom_domain: Optional[str] = None
    plan_type: Optional[PlanType] = None
    logo_url: Optional[HttpUrl] = None
    primary_color: Optional[str] = None
    secondary_color: Optional[str] = None
    favicon_url: Optional[HttpUrl] = None
    features: Optional[Dict[str, Any]] = None
    settings: Optional[Dict[str, Any]] = None

class OrganizationResponse(OrganizationBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class OrganizationList(BaseModel):
    organizations: list[OrganizationResponse]
    total: int
    page: int
    per_page: int 