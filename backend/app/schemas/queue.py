from pydantic import BaseModel
from typing import Optional
from datetime import datetime, date
from enum import Enum

class QueueStatus(str, Enum):
    ACTIVE = "active"
    PAUSED = "paused"
    CLOSED = "closed"

class QueueEntryStatus(str, Enum):
    WAITING = "waiting"
    CALLED = "called"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    NO_SHOW = "no_show"

class QueueCreate(BaseModel):
    provider_id: int
    name: str
    description: Optional[str] = None
    service_name: Optional[str] = None
    queue_date: Optional[date] = None
    max_size: int = 50
    estimated_wait_time: Optional[int] = None

class QueueUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[QueueStatus] = None
    max_size: Optional[int] = None
    estimated_wait_time: Optional[int] = None

class QueueResponse(BaseModel):
    id: int
    provider_id: int
    name: str
    description: Optional[str] = None
    service_name: Optional[str] = None
    queue_date: Optional[date] = None
    status: QueueStatus
    max_size: int
    estimated_wait_time: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class QueueEntryCreate(BaseModel):
    queue_id: int
    client_name: str
    client_phone: Optional[str] = None
    client_email: Optional[str] = None
    notes: Optional[str] = None

class QueueEntryUpdate(BaseModel):
    client_name: Optional[str] = None
    client_phone: Optional[str] = None
    client_email: Optional[str] = None
    status: Optional[QueueEntryStatus] = None
    notes: Optional[str] = None
    estimated_wait_time: Optional[int] = None

class QueueEntryResponse(BaseModel):
    id: int
    queue_id: int
    client_name: str
    client_phone: Optional[str] = None
    client_email: Optional[str] = None
    position: int
    status: QueueEntryStatus
    notes: Optional[str] = None
    joined_at: datetime
    called_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    estimated_wait_time: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True 