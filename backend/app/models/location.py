from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float, ForeignKey, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import enum
from app.core.database import Base

class LocationTrackingType(str, enum.Enum):
    CLIENT = "client"
    PROVIDER = "provider"

class LocationStatus(str, enum.Enum):
    UNKNOWN = "unknown"
    ON_THE_WAY = "on_the_way"
    ARRIVED = "arrived"
    AT_OFFICE = "at_office"
    AWAY_FROM_OFFICE = "away_from_office"

class LocationTracking(Base):
    __tablename__ = "location_tracking"
    
    id = Column(Integer, primary_key=True, index=True)
    appointment_id = Column(Integer, ForeignKey("appointments.id"), nullable=False)
    user_type = Column(String(20), nullable=False)  # 'client' or 'provider'
    
    # Location Data
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    accuracy = Column(Float)  # GPS accuracy in meters
    altitude = Column(Float)
    speed = Column(Float)  # Speed in m/s
    heading = Column(Float)  # Direction in degrees
    
    # Status and Analysis
    status = Column(String(20), default=LocationStatus.UNKNOWN)
    distance_to_appointment = Column(Float)  # Distance in meters
    estimated_travel_time = Column(Integer)  # Time in minutes
    is_moving = Column(Boolean, default=False)
    
    # Provider Office Location (for providers)
    office_latitude = Column(Float)  # Provider's office location
    office_longitude = Column(Float)
    distance_from_office = Column(Float)  # Distance from office in meters
    
    # Metadata
    device_info = Column(Text)  # Browser/device information
    ip_address = Column(String(45))  # IPv4 or IPv6
    user_agent = Column(Text)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    appointment = relationship("Appointment", back_populates="location_tracking")
    
    def __repr__(self):
        return f"<LocationTracking(id={self.id}, appointment_id={self.appointment_id}, status='{self.status}')>"

class ProviderOfficeLocation(Base):
    __tablename__ = "provider_office_locations"
    
    id = Column(Integer, primary_key=True, index=True)
    provider_id = Column(Integer, ForeignKey("providers.id"), nullable=False)
    
    # Office Location
    name = Column(String(255), nullable=False)  # e.g., "Main Office", "Branch 1"
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    address = Column(Text)
    radius = Column(Float, default=100.0)  # Radius in meters to consider "at office"
    
    # Settings
    is_primary = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    provider = relationship("Provider", back_populates="office_locations")
    
    def __repr__(self):
        return f"<ProviderOfficeLocation(id={self.id}, provider_id={self.provider_id}, name='{self.name}')>"
