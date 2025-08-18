from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey, Float
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base

class Service(Base):
    __tablename__ = "services"
    
    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    provider_id = Column(Integer, ForeignKey("providers.id"), nullable=True)  # If null, available to all providers in org
    
    # Service Information
    name = Column(String(255), nullable=False)
    description = Column(Text)
    category = Column(String(100))  # e.g., "consultation", "treatment", "examination"
    
    # Pricing and Duration
    duration = Column(Integer, nullable=False)  # minutes
    price = Column(Float, nullable=False, default=0.0)
    
    # Settings
    is_active = Column(Boolean, default=True)
    requires_approval = Column(Boolean, default=False)
    max_advance_booking_days = Column(Integer, default=30)
    buffer_time_before = Column(Integer, default=0)  # minutes
    buffer_time_after = Column(Integer, default=0)   # minutes
    
    # Availability Settings
    is_online_bookable = Column(Boolean, default=True)
    max_slots_per_day = Column(Integer, default=None)  # null = unlimited
    
    # Additional Information
    preparation_instructions = Column(Text)
    cancellation_policy = Column(Text)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    organization = relationship("Organization")
    provider = relationship("Provider", back_populates="services")
    
    def __repr__(self):
        return f"<Service(id={self.id}, name='{self.name}', duration={self.duration}, price={self.price})>"
