from pydantic import BaseModel, Field, validator
from typing import Optional, Dict, List, Any, Union
from datetime import datetime
import json

class PWAFeatures(BaseModel):
    """PWA Feature configuration"""
    notifications: bool = True
    offline_mode: bool = True
    location_access: bool = False
    camera_access: bool = False
    appointments: bool = True
    queue_management: bool = True
    client_portal: bool = True
    provider_directory: bool = True
    appointment_history: bool = True
    profile_management: bool = True
    push_notifications: bool = True
    background_sync: bool = True

class PWABranding(BaseModel):
    """PWA Branding configuration"""
    show_logo: bool = True
    show_company_name: bool = True
    show_footer: bool = True
    footer_text: Optional[str] = None
    contact_info: Optional[str] = None
    privacy_policy_url: Optional[str] = None
    terms_of_service_url: Optional[str] = None
    custom_favicon: bool = False
    custom_splash_screen: bool = False

class PWATypography(BaseModel):
    """PWA Typography settings"""
    font_family: str = "Inter"
    font_size_base: int = Field(16, ge=12, le=24)
    font_weight_normal: int = Field(400, ge=100, le=900)
    font_weight_bold: int = Field(600, ge=100, le=900)

class PWALayout(BaseModel):
    """PWA Layout settings"""
    layout_style: str = Field("modern", pattern="^(modern|classic|minimal|card)$")
    border_radius: int = Field(12, ge=0, le=24)
    card_shadow: str = Field("medium", pattern="^(none|light|medium|heavy)$")
    navigation_style: str = Field("bottom", pattern="^(bottom|top|sidebar)$")

class PWAColors(BaseModel):
    """PWA Color scheme"""
    theme_color: str = Field("#6366f1", pattern="^#[0-9A-Fa-f]{6}$")
    background_color: str = Field("#ffffff", pattern="^#[0-9A-Fa-f]{6}$")
    accent_color: str = Field("#8b5cf6", pattern="^#[0-9A-Fa-f]{6}$")
    primary_color: str = Field("#6366f1", pattern="^#[0-9A-Fa-f]{6}$")
    secondary_color: str = Field("#64748b", pattern="^#[0-9A-Fa-f]{6}$")
    success_color: str = Field("#10b981", pattern="^#[0-9A-Fa-f]{6}$")
    warning_color: str = Field("#f59e0b", pattern="^#[0-9A-Fa-f]{6}$")
    error_color: str = Field("#ef4444", pattern="^#[0-9A-Fa-f]{6}$")

class PWANotificationSettings(BaseModel):
    """PWA Push notification settings"""
    appointment_reminders: bool = True
    queue_updates: bool = True
    promotional_messages: bool = False
    reminder_hours_before: List[int] = [24, 2]
    quiet_hours_start: str = "22:00"
    quiet_hours_end: str = "08:00"

class PWAMenuItems(BaseModel):
    """Custom menu item"""
    label: str
    url: str
    icon: Optional[str] = None
    external: bool = False
    order: int = 0

class PWAAnalytics(BaseModel):
    """PWA Analytics configuration"""
    google_analytics_id: Optional[str] = None
    google_tag_manager_id: Optional[str] = None
    facebook_pixel_id: Optional[str] = None
    hotjar_site_id: Optional[str] = None
    intercom_app_id: Optional[str] = None

class PWALocalization(BaseModel):
    """PWA Localization settings"""
    default_language: str = Field("en", pattern="^[a-z]{2}$")
    supported_languages: List[str] = ["en"]
    rtl_support: bool = False

class PWAConfigCreate(BaseModel):
    """Create PWA configuration"""
    app_name: str = Field(..., min_length=1, max_length=255)
    app_short_name: Optional[str] = Field(None, max_length=12)
    app_description: Optional[str] = None
    app_version: str = "1.0.0"
    
    # Colors
    theme_color: str = "#6366f1"
    background_color: str = "#ffffff"
    accent_color: str = "#8b5cf6"
    primary_color: str = "#6366f1"
    secondary_color: str = "#64748b"
    success_color: str = "#10b981"
    warning_color: str = "#f59e0b"
    error_color: str = "#ef4444"
    
    # Typography
    font_family: str = "Inter"
    font_size_base: int = 16
    font_weight_normal: int = 400
    font_weight_bold: int = 600
    
    # Layout
    border_radius: int = 12
    card_shadow: str = "medium"
    layout_style: str = "modern"
    
    # Images
    logo_url: Optional[str] = None
    icon_url: Optional[str] = None
    icon_192_url: Optional[str] = None
    icon_512_url: Optional[str] = None
    favicon_url: Optional[str] = None
    splash_image: Optional[str] = None
    background_image: Optional[str] = None
    
    # PWA Settings
    display: str = "standalone"
    orientation: str = "any"
    start_url: str = "/"
    scope: str = "/"
    
    # Content
    welcome_message: str = "Welcome to your appointment portal"
    welcome_subtitle: Optional[str] = None
    footer_text: Optional[str] = None
    contact_info: Optional[str] = None
    privacy_policy_url: Optional[str] = None
    terms_of_service_url: Optional[str] = None
    
    # Features (JSON)
    features: Optional[Dict[str, Any]] = None
    branding: Optional[Dict[str, Any]] = None
    
    # Navigation
    navigation_style: str = "bottom"
    show_logo: bool = True
    show_company_name: bool = True
    custom_menu_items: Optional[List[Dict[str, Any]]] = None
    
    # Advanced
    custom_css: Optional[str] = None
    custom_js: Optional[str] = None
    custom_html_head: Optional[str] = None
    custom_html_body: Optional[str] = None
    
    # Analytics
    google_analytics_id: Optional[str] = None
    google_tag_manager_id: Optional[str] = None
    facebook_pixel_id: Optional[str] = None
    hotjar_site_id: Optional[str] = None
    intercom_app_id: Optional[str] = None
    
    # PWA Features
    enable_push_notifications: bool = True
    push_notification_settings: Optional[Union[Dict[str, Any], str]] = None
    enable_offline_mode: bool = True
    offline_message: str = "You are currently offline"
    cache_strategy: str = "cache_first"
    
    # Localization
    default_language: str = "en"
    supported_languages: Optional[Union[List[str], str]] = None
    rtl_support: bool = False
    
    # Status
    is_active: bool = True
    is_published: bool = False

    @validator('app_short_name')
    def validate_short_name(cls, v, values):
        if v is None and 'app_name' in values:
            return values['app_name'][:12]
        return v

    @validator('features')
    def validate_features(cls, v):
        if v is None:
            return json.dumps(PWAFeatures().dict())
        if isinstance(v, dict):
            return json.dumps(v)
        return v

    @validator('branding')
    def validate_branding(cls, v):
        if v is None:
            return json.dumps(PWABranding().dict())
        if isinstance(v, dict):
            return json.dumps(v)
        return v

    @validator('custom_menu_items')
    def validate_menu_items(cls, v):
        if v is None:
            return None
        if isinstance(v, list):
            return json.dumps(v)
        return v

    @validator('push_notification_settings')
    def validate_push_settings(cls, v):
        if v is None:
            return json.dumps(PWANotificationSettings().dict())
        if isinstance(v, dict):
            return json.dumps(v)
        if isinstance(v, str):
            # If it's already a JSON string, validate it can be parsed and return as-is
            try:
                json.loads(v)
                return v
            except json.JSONDecodeError:
                # If invalid JSON, return default
                return json.dumps(PWANotificationSettings().dict())
        return v

    @validator('supported_languages')
    def validate_supported_languages(cls, v):
        if v is None:
            return json.dumps(["en"])
        if isinstance(v, list):
            return json.dumps(v)
        if isinstance(v, str):
            # If it's already a JSON string, validate it can be parsed and return as-is
            try:
                parsed = json.loads(v)
                if isinstance(parsed, list):
                    return v
                else:
                    # If not a list, return default
                    return json.dumps(["en"])
            except json.JSONDecodeError:
                # If invalid JSON, return default
                return json.dumps(["en"])
        return v

    @validator('features')
    def validate_features(cls, v):
        if v is None:
            return None
        if isinstance(v, dict):
            return json.dumps(v)
        return v

    @validator('branding')
    def validate_branding(cls, v):
        if v is None:
            return None
        if isinstance(v, dict):
            return json.dumps(v)
        return v

class PWAConfigUpdate(BaseModel):
    """Update PWA configuration"""
    app_name: Optional[str] = None
    app_short_name: Optional[str] = None
    app_description: Optional[str] = None
    app_version: Optional[str] = None
    
    # Colors
    theme_color: Optional[str] = None
    background_color: Optional[str] = None
    accent_color: Optional[str] = None
    primary_color: Optional[str] = None
    secondary_color: Optional[str] = None
    success_color: Optional[str] = None
    warning_color: Optional[str] = None
    error_color: Optional[str] = None
    
    # Typography
    font_family: Optional[str] = None
    font_size_base: Optional[int] = None
    font_weight_normal: Optional[int] = None
    font_weight_bold: Optional[int] = None
    
    # Layout
    border_radius: Optional[int] = None
    card_shadow: Optional[str] = None
    layout_style: Optional[str] = None
    
    # Images
    logo_url: Optional[str] = None
    icon_url: Optional[str] = None
    icon_192_url: Optional[str] = None
    icon_512_url: Optional[str] = None
    favicon_url: Optional[str] = None
    splash_image: Optional[str] = None
    background_image: Optional[str] = None
    
    # PWA Settings
    display: Optional[str] = None
    orientation: Optional[str] = None
    start_url: Optional[str] = None
    scope: Optional[str] = None
    
    # Content
    welcome_message: Optional[str] = None
    welcome_subtitle: Optional[str] = None
    footer_text: Optional[str] = None
    contact_info: Optional[str] = None
    privacy_policy_url: Optional[str] = None
    terms_of_service_url: Optional[str] = None
    
    # Features (JSON)
    features: Optional[str] = None
    branding: Optional[str] = None
    
    # Navigation
    navigation_style: Optional[str] = None
    show_logo: Optional[bool] = None
    show_company_name: Optional[bool] = None
    custom_menu_items: Optional[str] = None
    
    # Advanced
    custom_css: Optional[str] = None
    custom_js: Optional[str] = None
    custom_html_head: Optional[str] = None
    custom_html_body: Optional[str] = None
    
    # Analytics
    google_analytics_id: Optional[str] = None
    google_tag_manager_id: Optional[str] = None
    facebook_pixel_id: Optional[str] = None
    hotjar_site_id: Optional[str] = None
    intercom_app_id: Optional[str] = None
    
    # PWA Features
    enable_push_notifications: Optional[bool] = None
    push_notification_settings: Optional[str] = None
    enable_offline_mode: Optional[bool] = None
    offline_message: Optional[str] = None
    cache_strategy: Optional[str] = None
    
    # Localization
    default_language: Optional[str] = None
    supported_languages: Optional[str] = None
    rtl_support: Optional[bool] = None
    
    # Status
    is_active: Optional[bool] = None
    is_published: Optional[bool] = None

class PWAConfigResponse(BaseModel):
    """PWA configuration response"""
    id: int
    organization_id: int
    
    # Basic Info
    app_name: str
    app_short_name: Optional[str] = None
    app_description: Optional[str] = None
    app_version: str
    
    # Colors
    theme_color: str
    background_color: str
    accent_color: str
    primary_color: str
    secondary_color: str
    success_color: str
    warning_color: str
    error_color: str
    
    # Typography
    font_family: str
    font_size_base: int
    font_weight_normal: int
    font_weight_bold: int
    
    # Layout
    border_radius: int
    card_shadow: str
    layout_style: str
    
    # Images
    logo_url: Optional[str] = None
    icon_url: Optional[str] = None
    icon_192_url: Optional[str] = None
    icon_512_url: Optional[str] = None
    favicon_url: Optional[str] = None
    splash_image: Optional[str] = None
    background_image: Optional[str] = None
    
    # PWA Settings
    display: str
    orientation: str
    start_url: str
    scope: str
    
    # Content
    welcome_message: str
    welcome_subtitle: Optional[str] = None
    footer_text: Optional[str] = None
    contact_info: Optional[str] = None
    privacy_policy_url: Optional[str] = None
    terms_of_service_url: Optional[str] = None
    
    # Features (JSON)
    features: Optional[str] = None
    branding: Optional[str] = None
    
    # Navigation
    navigation_style: str
    show_logo: bool
    show_company_name: bool
    custom_menu_items: Optional[str] = None
    
    # Advanced
    custom_css: Optional[str] = None
    custom_js: Optional[str] = None
    custom_html_head: Optional[str] = None
    custom_html_body: Optional[str] = None
    
    # Analytics
    google_analytics_id: Optional[str] = None
    google_tag_manager_id: Optional[str] = None
    facebook_pixel_id: Optional[str] = None
    hotjar_site_id: Optional[str] = None
    intercom_app_id: Optional[str] = None
    
    # PWA Features
    enable_push_notifications: bool
    push_notification_settings: Optional[str] = None
    enable_offline_mode: bool
    offline_message: str
    cache_strategy: str
    
    # Localization
    default_language: str
    supported_languages: Optional[str] = None
    rtl_support: bool
    
    # Status
    is_active: bool
    is_published: bool
    published_at: Optional[datetime] = None
    version_number: int
    
    # Timestamps
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

    @property
    def features_parsed(self) -> PWAFeatures:
        """Parse features JSON string"""
        if self.features:
            try:
                return PWAFeatures(**json.loads(self.features))
            except (json.JSONDecodeError, TypeError):
                pass
        return PWAFeatures()

    @property
    def branding_parsed(self) -> PWABranding:
        """Parse branding JSON string"""
        if self.branding:
            try:
                return PWABranding(**json.loads(self.branding))
            except (json.JSONDecodeError, TypeError):
                pass
        return PWABranding()

    @property
    def push_notification_settings_parsed(self) -> PWANotificationSettings:
        """Parse push notification settings JSON string"""
        if self.push_notification_settings:
            try:
                return PWANotificationSettings(**json.loads(self.push_notification_settings))
            except (json.JSONDecodeError, TypeError):
                pass
        return PWANotificationSettings()

    @property
    def custom_menu_items_parsed(self) -> List[PWAMenuItems]:
        """Parse custom menu items JSON string"""
        if self.custom_menu_items:
            try:
                items = json.loads(self.custom_menu_items)
                return [PWAMenuItems(**item) for item in items]
            except (json.JSONDecodeError, TypeError):
                pass
        return []

    @property
    def supported_languages_parsed(self) -> List[str]:
        """Parse supported languages JSON string"""
        if self.supported_languages:
            try:
                return json.loads(self.supported_languages)
            except (json.JSONDecodeError, TypeError):
                pass
        return ["en"]

# Convenience schemas for structured data
class PWAThemePreset(BaseModel):
    """Predefined theme preset"""
    name: str
    label: str
    colors: PWAColors
    typography: PWATypography
    layout: PWALayout

class PWATemplateResponse(BaseModel):
    """PWA template response with presets"""
    themes: List[PWAThemePreset]
    default_features: PWAFeatures
    default_branding: PWABranding