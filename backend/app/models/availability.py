from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey, JSON, Time, Date
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base
import enum

class DayOfWeek(enum.Enum):
    MONDAY = "monday"
    TUESDAY = "tuesday"
    WEDNESDAY = "wednesday"
    THURSDAY = "thursday"
    FRIDAY = "friday"
    SATURDAY = "saturday"
    SUNDAY = "sunday"

class AvailabilityType(enum.Enum):
    RECURRING = "recurring"  # Weekly recurring schedule
    EXCEPTION = "exception"  # One-time override (vacation, holiday, etc.)
    SPECIAL = "special"      # Special hours for specific dates

class Availability(Base):
    __tablename__ = "availability"
    
    id = Column(Integer, primary_key=True, index=True)
    provider_id = Column(Integer, ForeignKey("providers.id"), nullable=False)
    
    # Type of availability rule
    availability_type = Column(String(20), nullable=False, default="recurring")  # recurring, exception, special
    
    # For recurring availability (weekly schedule)
    day_of_week = Column(String(10), nullable=True)  # monday, tuesday, etc.
    start_time = Column(Time, nullable=True)
    end_time = Column(Time, nullable=True)
    
    # For date-specific availability (exceptions/special dates)
    specific_date = Column(Date, nullable=True)
    
    # Availability status
    is_available = Column(Boolean, default=True)
    
    # Break times within the availability window (stored as JSON)
    # Format: [{"start": "12:00", "end": "13:00", "title": "Lunch Break"}]
    breaks = Column(JSON, default=list)
    
    # Booking settings for this availability slot
    max_bookings = Column(Integer, nullable=True)  # Max appointments in this slot
    buffer_minutes = Column(Integer, default=0)    # Buffer time between appointments
    
    # Additional settings
    is_active = Column(Boolean, default=True)
    notes = Column(Text, nullable=True)
    
    # Priority for overlapping rules (higher number = higher priority)
    priority = Column(Integer, default=0)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    provider = relationship("Provider", back_populates="availability")
    
    def __repr__(self):
        if self.availability_type == "recurring":
            return f"<Availability(provider_id={self.provider_id}, {self.day_of_week} {self.start_time}-{self.end_time})>"
        else:
            return f"<Availability(provider_id={self.provider_id}, {self.specific_date} {self.availability_type})>"

class AvailabilityException(Base):
    __tablename__ = "availability_exceptions"
    
    id = Column(Integer, primary_key=True, index=True)
    provider_id = Column(Integer, ForeignKey("providers.id"), nullable=False)
    
    # Date range for the exception
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    
    # Exception type
    exception_type = Column(String(20), nullable=False)  # vacation, holiday, sick, unavailable
    
    # Override availability for this period
    is_available = Column(Boolean, default=False)
    
    # Optional custom hours for this exception period
    custom_hours = Column(JSON, nullable=True)  # {"monday": {"start": "09:00", "end": "17:00"}, ...}
    
    # Description
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    
    # Settings
    is_active = Column(Boolean, default=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    provider = relationship("Provider")
    
    def __repr__(self):
        return f"<AvailabilityException(provider_id={self.provider_id}, {self.start_date} to {self.end_date}, {self.exception_type})>"
