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
    
    # Account and invitation fields
    has_account: bool
    invitation_sent_at: Optional[datetime] = None
    invitation_expires_at: Optional[datetime] = None
    account_created_at: Optional[datetime] = None
    last_login_at: Optional[datetime] = None
    
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

class ClientInvitation(BaseModel):
    """Request to send invitation to a client"""
    client_id: int
    send_invitation: bool = True

class ClientInvitationResponse(BaseModel):
    """Response after sending invitation"""
    success: bool
    message: str
    invitation_sent_at: Optional[datetime] = None
    invitation_expires_at: Optional[datetime] = None

class ClientRegistration(BaseModel):
    """Client registration for PWA account"""
    invitation_token: str
    password: str = Field(..., min_length=8, max_length=100)
    confirm_password: str = Field(..., min_length=8, max_length=100)

class ClientRegistrationResponse(BaseModel):
    """Response after client registration"""
    success: bool
    message: str
    client_id: int
    access_token: Optional[str] = None

class ClientLoginRequest(BaseModel):
    """Client login for PWA"""
    email: EmailStr
    password: str

class ClientLoginResponse(BaseModel):
    """Response after client login"""
    success: bool
    message: str
    access_token: str
    client: ClientResponse
    providers: list  # List of providers this client has appointments with

class ClientForgotPasswordRequest(BaseModel):
    """Request for password reset"""
    email: EmailStr

class ClientForgotPasswordResponse(BaseModel):
    """Response after password reset request"""
    success: bool
    message: str
