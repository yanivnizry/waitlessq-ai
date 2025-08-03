from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, JSON, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base

class Organization(Base):
    __tablename__ = "organizations"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Organization Information
    name = Column(String(255), nullable=False)
    slug = Column(String(100), unique=True, nullable=False, index=True)  # e.g., "acme-corp"
    description = Column(Text)
    
    # Contact Information
    contact_email = Column(String(255))
    contact_phone = Column(String(20))
    address = Column(Text)
    city = Column(String(100))
    state = Column(String(100))
    zip_code = Column(String(20))
    country = Column(String(100))
    
    # Domain Configuration
    subdomain = Column(String(100), unique=True)  # e.g., "acme"
    custom_domain = Column(String(255), unique=True)  # e.g., "appointments.acme.com"
    
    # Organization Settings
    is_active = Column(Boolean, default=True)
    plan_type = Column(String(50), default="basic")  # basic, pro, enterprise
    max_providers = Column(Integer, default=5)
    max_users = Column(Integer, default=20)
    max_storage_gb = Column(Integer, default=10)
    
    # Branding
    logo_url = Column(String(500))
    primary_color = Column(String(7), default="#3B82F6")
    secondary_color = Column(String(7), default="#1F2937")
    favicon_url = Column(String(500))
    
    # Features Configuration (JSON)
    features = Column(JSON, default={
        "appointments": True,
        "queues": True,
        "pwa": True,
        "analytics": False,
        "integrations": False,
        "custom_branding": False,
        "api_access": False
    })
    
    # Settings Configuration (JSON)
    settings = Column(JSON, default={
        "timezone": "UTC",
        "date_format": "MM/DD/YYYY",
        "time_format": "12h",
        "language": "en",
        "notifications": {
            "email": True,
            "sms": False,
            "push": True
        },
        "privacy": {
            "data_retention_days": 365,
            "gdpr_compliant": False
        }
    })
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    users = relationship("User", back_populates="organization")
    providers = relationship("Provider", back_populates="organization")
    
    def __repr__(self):
        return f"<Organization(id={self.id}, name='{self.name}', slug='{self.slug}')>" 