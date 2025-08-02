from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from backend.app.core.database import Base

class PWAConfig(Base):
    __tablename__ = "pwa_configs"
    
    id = Column(Integer, primary_key=True, index=True)
    provider_id = Column(Integer, ForeignKey("providers.id"), nullable=False, unique=True)
    
    # PWA Basic Info
    app_name = Column(String(255), nullable=False)
    app_description = Column(Text)
    app_version = Column(String(20), default="1.0.0")
    
    # Branding
    primary_color = Column(String(7), default="#3B82F6")  # hex color
    secondary_color = Column(String(7), default="#1F2937")
    accent_color = Column(String(7), default="#F59E0B")
    background_color = Column(String(7), default="#FFFFFF")
    text_color = Column(String(7), default="#1F2937")
    
    # Icons and Images
    icon_192 = Column(String(500))  # 192x192 icon URL
    icon_512 = Column(String(500))  # 512x512 icon URL
    splash_image = Column(String(500))  # Splash screen image
    logo_url = Column(String(500))
    
    # PWA Manifest Settings
    display_mode = Column(String(20), default="standalone")  # standalone, fullscreen, minimal-ui
    orientation = Column(String(20), default="portrait")  # portrait, landscape, any
    theme_color = Column(String(7), default="#3B82F6")
    
    # Customization
    welcome_message = Column(Text, default="Welcome! Book your appointment with us.")
    booking_instructions = Column(Text)
    queue_instructions = Column(Text, default="Join our queue to be seen as soon as possible.")
    
    # Features
    enable_appointments = Column(Boolean, default=True)
    enable_queue = Column(Boolean, default=True)
    enable_notifications = Column(Boolean, default=True)
    enable_offline = Column(Boolean, default=True)
    
    # Custom CSS/JS
    custom_css = Column(Text)
    custom_js = Column(Text)
    
    # Analytics and Tracking
    google_analytics_id = Column(String(50))
    facebook_pixel_id = Column(String(50))
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    provider = relationship("Provider", back_populates="pwa_config")
    
    def __repr__(self):
        return f"<PWAConfig(id={self.id}, app_name='{self.app_name}', provider_id={self.provider_id})>" 