from pydantic import BaseModel, Field, EmailStr
from typing import Optional
from datetime import datetime

class ClientBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, max_length=50)
    date_of_birth: Optional[str] = Field(None, max_length=20, description="YYYY-MM-DD format")
    address: Optional[str] = None
    emergency_contact: Optional[str] = Field(None, max_length=255)
    emergency_phone: Optional[str] = Field(None, max_length=50)
    medical_conditions: Optional[str] = None
    allergies: Optional[str] = None
    notes: Optional[str] = None
    preferred_communication: str = Field("email", pattern="^(email|phone|sms)$")
    marketing_consent: bool = False
    is_active: bool = True

class ClientCreate(ClientBase):
    pass

class ClientUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, max_length=50)
    date_of_birth: Optional[str] = Field(None, max_length=20, description="YYYY-MM-DD format")
    address: Optional[str] = None
    emergency_contact: Optional[str] = Field(None, max_length=255)
    emergency_phone: Optional[str] = Field(None, max_length=50)
    medical_conditions: Optional[str] = None
    allergies: Optional[str] = None
    notes: Optional[str] = None
    preferred_communication: Optional[str] = Field(None, pattern="^(email|phone|sms)$")
    marketing_consent: Optional[bool] = None
    is_active: Optional[bool] = None

class ClientResponse(ClientBase):
    id: int
    organization_id: int
    total_appointments: int
    last_appointment_date: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class ClientListResponse(BaseModel):
    clients: list[ClientResponse]
    total: int
    page: int
    per_page: int
    total_pages: int

class ClientStats(BaseModel):
    total_clients: int
    active_clients: int
    inactive_clients: int
    new_clients_this_month: int
    clients_with_appointments: int
    average_appointments_per_client: float
    top_communication_preference: str

class ClientSummary(BaseModel):
    """Simplified client info for dropdowns and selection"""
    id: int
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    total_appointments: int
    last_appointment_date: Optional[datetime] = None
    
    class Config:
        from_attributes = True
