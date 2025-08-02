from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from enum import Enum

class AppointmentStatus(str, Enum):
    SCHEDULED = "scheduled"
    CONFIRMED = "confirmed"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    NO_SHOW = "no_show"

class AppointmentCreate(BaseModel):
    provider_id: int
    client_name: str
    client_email: Optional[str] = None
    client_phone: Optional[str] = None
    service_name: str
    service_description: Optional[str] = None
    duration: int = 30
    scheduled_at: datetime
    notes: Optional[str] = None
    client_notes: Optional[str] = None
    special_requests: Optional[str] = None

class AppointmentUpdate(BaseModel):
    client_name: Optional[str] = None
    client_email: Optional[str] = None
    client_phone: Optional[str] = None
    service_name: Optional[str] = None
    service_description: Optional[str] = None
    duration: Optional[int] = None
    scheduled_at: Optional[datetime] = None
    status: Optional[AppointmentStatus] = None
    notes: Optional[str] = None
    internal_notes: Optional[str] = None
    client_notes: Optional[str] = None
    special_requests: Optional[str] = None

class AppointmentResponse(BaseModel):
    id: int
    provider_id: int
    client_name: str
    client_email: Optional[str] = None
    client_phone: Optional[str] = None
    service_name: str
    service_description: Optional[str] = None
    duration: int
    scheduled_at: datetime
    end_time: Optional[datetime] = None
    status: AppointmentStatus
    notes: Optional[str] = None
    internal_notes: Optional[str] = None
    client_notes: Optional[str] = None
    special_requests: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    confirmed_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True 