from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base

class PWAConfig(Base):
    __tablename__ = "pwa_configs"
    
    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, unique=True)
    
    # PWA Basic Info
    app_name = Column(String(255), nullable=False)
    app_short_name = Column(String(12))
    app_description = Column(Text)
    app_version = Column(String(20), default="1.0.0")
    
    # Branding & Colors
    theme_color = Column(String(7), default="#6366f1")
    background_color = Column(String(7), default="#ffffff")
    accent_color = Column(String(7), default="#8b5cf6")
    primary_color = Column(String(7), default="#6366f1")
    secondary_color = Column(String(7), default="#64748b")
    success_color = Column(String(7), default="#10b981")
    warning_color = Column(String(7), default="#f59e0b")
    error_color = Column(String(7), default="#ef4444")
    
    # Typography
    font_family = Column(String(100), default="Inter")
    font_size_base = Column(Integer, default=16)
    font_weight_normal = Column(Integer, default=400)
    font_weight_bold = Column(Integer, default=600)
    
    # Layout & Design
    border_radius = Column(Integer, default=12)
    card_shadow = Column(String(50), default="medium")
    layout_style = Column(String(20), default="modern")
    
    # Icons and Images
    logo_url = Column(String(500))
    icon_192_url = Column(String(500))
    icon_512_url = Column(String(500))
    favicon_url = Column(String(500))
    splash_image = Column(String(500))
    background_image = Column(String(500))
    
    # PWA Manifest Settings
    display = Column(String(20), default="standalone")
    orientation = Column(String(20), default="any")
    start_url = Column(String(100), default="/")
    scope = Column(String(100), default="/")
    
    # Content Customization
    welcome_message = Column(Text, default="Welcome to your appointment portal")
    welcome_subtitle = Column(Text)
    footer_text = Column(Text)
    contact_info = Column(Text)
    privacy_policy_url = Column(String(500))
    terms_of_service_url = Column(String(500))
    
    # Features Configuration (JSON)
    features = Column(Text)  # JSON field for feature flags
    
    # Branding Configuration (JSON)
    branding = Column(Text)  # JSON field for branding options
    
    # Navigation & Menu
    navigation_style = Column(String(20), default="bottom")
    show_logo = Column(Boolean, default=True)
    show_company_name = Column(Boolean, default=True)
    custom_menu_items = Column(Text)  # JSON array
    
    # Advanced Customization
    custom_css = Column(Text)
    custom_js = Column(Text)
    custom_html_head = Column(Text)
    custom_html_body = Column(Text)
    
    # Analytics & Integrations
    google_analytics_id = Column(String(50))
    google_tag_manager_id = Column(String(50))
    facebook_pixel_id = Column(String(50))
    hotjar_site_id = Column(String(50))
    intercom_app_id = Column(String(50))
    
    # PWA Advanced Features
    enable_push_notifications = Column(Boolean, default=True)
    push_notification_settings = Column(Text)  # JSON
    enable_offline_mode = Column(Boolean, default=True)
    offline_message = Column(Text, default="You are currently offline")
    cache_strategy = Column(String(20), default="cache_first")
    
    # Localization
    default_language = Column(String(5), default="en")
    supported_languages = Column(Text)  # JSON array
    rtl_support = Column(Boolean, default=False)
    
    # Status and Metadata
    is_active = Column(Boolean, default=True)
    is_published = Column(Boolean, default=False)
    published_at = Column(DateTime(timezone=True))
    version_number = Column(Integer, default=1)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    organization = relationship("Organization", back_populates="pwa_config")
    
    def __repr__(self):
        return f"<PWAConfig(id={self.id}, app_name='{self.app_name}', organization_id={self.organization_id})>" 