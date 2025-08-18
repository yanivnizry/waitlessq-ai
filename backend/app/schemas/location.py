from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

# Location Tracking Schemas
class LocationTrackingBase(BaseModel):
    appointment_id: int
    user_type: str = Field(..., description="'client' or 'provider'")
    latitude: float = Field(..., ge=-90, le=90, description="Latitude in decimal degrees")
    longitude: float = Field(..., ge=-180, le=180, description="Longitude in decimal degrees")
    accuracy: Optional[float] = Field(None, ge=0, description="GPS accuracy in meters")
    altitude: Optional[float] = None
    speed: Optional[float] = Field(None, ge=0, description="Speed in m/s")
    heading: Optional[float] = Field(None, ge=0, lt=360, description="Direction in degrees")
    device_info: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None

class LocationTrackingCreate(LocationTrackingBase):
    pass

class LocationTrackingUpdate(BaseModel):
    latitude: Optional[float] = Field(None, ge=-90, le=90)
    longitude: Optional[float] = Field(None, ge=-180, le=180)
    accuracy: Optional[float] = Field(None, ge=0)
    altitude: Optional[float] = None
    speed: Optional[float] = Field(None, ge=0)
    heading: Optional[float] = Field(None, ge=0, lt=360)
    status: Optional[str] = None
    device_info: Optional[str] = None

class LocationTrackingResponse(LocationTrackingBase):
    id: int
    status: str
    distance_to_appointment: Optional[float]
    estimated_travel_time: Optional[int]
    is_moving: bool
    office_latitude: Optional[float]
    office_longitude: Optional[float]
    distance_from_office: Optional[float]
    created_at: datetime
    updated_at: Optional[datetime]
    
    class Config:
        from_attributes = True

# Provider Office Location Schemas
class ProviderOfficeLocationBase(BaseModel):
    provider_id: int
    name: str = Field(..., min_length=1, max_length=255)
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    address: Optional[str] = None
    radius: float = Field(100.0, ge=1, le=10000, description="Radius in meters")
    is_primary: bool = False
    is_active: bool = True

class ProviderOfficeLocationCreate(ProviderOfficeLocationBase):
    pass

class ProviderOfficeLocationUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    latitude: Optional[float] = Field(None, ge=-90, le=90)
    longitude: Optional[float] = Field(None, ge=-180, le=180)
    address: Optional[str] = None
    radius: Optional[float] = Field(None, ge=1, le=10000)
    is_primary: Optional[bool] = None
    is_active: Optional[bool] = None

class ProviderOfficeLocationResponse(ProviderOfficeLocationBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime]
    
    class Config:
        from_attributes = True

# Location Status Schemas
class LocationStatusResponse(BaseModel):
    appointment_id: int
    client_status: Optional[str] = None
    client_distance: Optional[float] = None
    client_eta: Optional[int] = None
    client_is_moving: bool = False
    provider_status: Optional[str] = None
    provider_distance_from_office: Optional[float] = None
    provider_at_office: bool = False
    last_updated: Optional[datetime] = None

# Travel Time Estimation
class TravelTimeRequest(BaseModel):
    from_latitude: float = Field(..., ge=-90, le=90)
    from_longitude: float = Field(..., ge=-180, le=180)
    to_latitude: float = Field(..., ge=-90, le=90)
    to_longitude: float = Field(..., ge=-180, le=180)
    transport_mode: str = Field("driving", description="driving, walking, transit")

class TravelTimeResponse(BaseModel):
    distance_meters: float
    duration_minutes: int
    transport_mode: str
    estimated_arrival: datetime
