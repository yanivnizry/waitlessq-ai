from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, JSON, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from backend.app.core.database import Base

class Provider(Base):
    __tablename__ = "providers"
    
    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Business Information
    business_name = Column(String(255), nullable=False)
    business_description = Column(Text)
    business_type = Column(String(100))  # e.g., "salon", "clinic", "consultation"
    
    # Contact Information
    phone = Column(String(20))
    website = Column(String(500))
    address = Column(Text)
    city = Column(String(100))
    state = Column(String(100))
    zip_code = Column(String(20))
    country = Column(String(100))
    
    # Business Hours (stored as JSON)
    business_hours = Column(JSON)  # {"monday": {"open": "09:00", "close": "17:00"}, ...}
    
    # Settings
    is_active = Column(Boolean, default=True)
    accepts_walk_ins = Column(Boolean, default=True)
    max_queue_size = Column(Integer, default=50)
    appointment_duration = Column(Integer, default=30)  # minutes
    buffer_time = Column(Integer, default=15)  # minutes between appointments
    
    # Branding (inherits from organization but can be overridden)
    logo_url = Column(String(500))
    primary_color = Column(String(7))  # inherits from organization if null
    secondary_color = Column(String(7))  # inherits from organization if null
    
    # Provider-specific settings
    settings = Column(JSON, default={
        "notifications": {
            "email": True,
            "sms": False,
            "push": True
        },
        "appointments": {
            "allow_overbooking": False,
            "require_confirmation": True,
            "auto_confirm": False
        },
        "queues": {
            "auto_call_next": True,
            "estimated_wait_time": True,
            "max_wait_time": 120  # minutes
        }
    })
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    organization = relationship("Organization", back_populates="providers")
    user = relationship("User", back_populates="providers")
    appointments = relationship("Appointment", back_populates="provider")
    queues = relationship("Queue", back_populates="provider")
    
    def __repr__(self):
        return f"<Provider(id={self.id}, business_name='{self.business_name}', organization_id={self.organization_id})>" 