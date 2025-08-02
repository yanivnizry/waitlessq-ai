from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey, Enum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import enum
from backend.app.core.database import Base

class AppointmentStatus(str, enum.Enum):
    SCHEDULED = "scheduled"
    CONFIRMED = "confirmed"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    NO_SHOW = "no_show"

class Appointment(Base):
    __tablename__ = "appointments"
    
    id = Column(Integer, primary_key=True, index=True)
    provider_id = Column(Integer, ForeignKey("providers.id"), nullable=False)
    client_name = Column(String(255), nullable=False)
    client_email = Column(String(255))
    client_phone = Column(String(20))
    
    # Appointment Details
    service_name = Column(String(255), nullable=False)
    service_description = Column(Text)
    duration = Column(Integer, default=30)  # minutes
    
    # Scheduling
    scheduled_at = Column(DateTime(timezone=True), nullable=False)
    end_time = Column(DateTime(timezone=True))
    
    # Status and Notes
    status = Column(Enum(AppointmentStatus), default=AppointmentStatus.SCHEDULED)
    notes = Column(Text)
    internal_notes = Column(Text)  # Provider-only notes
    
    # Client Information
    client_notes = Column(Text)  # Notes from client during booking
    special_requests = Column(Text)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    confirmed_at = Column(DateTime(timezone=True))
    completed_at = Column(DateTime(timezone=True))
    
    # Relationships
    provider = relationship("Provider", back_populates="appointments")
    
    def __repr__(self):
        return f"<Appointment(id={self.id}, client_name='{self.client_name}', scheduled_at='{self.scheduled_at}')>" 