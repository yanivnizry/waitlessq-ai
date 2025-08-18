from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base

class Client(Base):
    __tablename__ = "clients"
    
    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    
    # Basic client information
    name = Column(String(255), nullable=False, index=True)
    email = Column(String(255), nullable=True, index=True)
    phone = Column(String(50), nullable=True, index=True)
    
    # Additional client details
    date_of_birth = Column(String(20), nullable=True)  # YYYY-MM-DD format
    address = Column(Text, nullable=True)
    emergency_contact = Column(String(255), nullable=True)
    emergency_phone = Column(String(50), nullable=True)
    
    # Medical/Service notes
    medical_conditions = Column(Text, nullable=True)
    allergies = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    
    # Client preferences
    preferred_communication = Column(String(20), default="email")  # email, phone, sms
    marketing_consent = Column(Boolean, default=False)
    
    # Status and metadata
    is_active = Column(Boolean, default=True, index=True)
    total_appointments = Column(Integer, default=0)
    last_appointment_date = Column(DateTime(timezone=True), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    organization = relationship("Organization", back_populates="clients")
    appointments = relationship("Appointment", back_populates="client")
    
    def __repr__(self):
        return f"<Client(id={self.id}, name='{self.name}', email='{self.email}', organization_id={self.organization_id})>"
