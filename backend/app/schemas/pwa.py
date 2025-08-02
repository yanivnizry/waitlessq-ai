from pydantic import BaseModel
from typing import Optional

class PWAConfigCreate(BaseModel):
    provider_id: int
    app_name: str
    app_description: Optional[str] = None
    app_version: str = "1.0.0"
    primary_color: str = "#3B82F6"
    secondary_color: str = "#1F2937"
    accent_color: str = "#F59E0B"
    background_color: str = "#FFFFFF"
    text_color: str = "#1F2937"
    icon_192: Optional[str] = None
    icon_512: Optional[str] = None
    splash_image: Optional[str] = None
    logo_url: Optional[str] = None
    display_mode: str = "standalone"
    orientation: str = "portrait"
    theme_color: str = "#3B82F6"
    welcome_message: str = "Welcome! Book your appointment with us."
    booking_instructions: Optional[str] = None
    queue_instructions: str = "Join our queue to be seen as soon as possible."
    enable_appointments: bool = True
    enable_queue: bool = True
    enable_notifications: bool = True
    enable_offline: bool = True
    custom_css: Optional[str] = None
    custom_js: Optional[str] = None
    google_analytics_id: Optional[str] = None
    facebook_pixel_id: Optional[str] = None

class PWAConfigUpdate(BaseModel):
    app_name: Optional[str] = None
    app_description: Optional[str] = None
    app_version: Optional[str] = None
    primary_color: Optional[str] = None
    secondary_color: Optional[str] = None
    accent_color: Optional[str] = None
    background_color: Optional[str] = None
    text_color: Optional[str] = None
    icon_192: Optional[str] = None
    icon_512: Optional[str] = None
    splash_image: Optional[str] = None
    logo_url: Optional[str] = None
    display_mode: Optional[str] = None
    orientation: Optional[str] = None
    theme_color: Optional[str] = None
    welcome_message: Optional[str] = None
    booking_instructions: Optional[str] = None
    queue_instructions: Optional[str] = None
    enable_appointments: Optional[bool] = None
    enable_queue: Optional[bool] = None
    enable_notifications: Optional[bool] = None
    enable_offline: Optional[bool] = None
    custom_css: Optional[str] = None
    custom_js: Optional[str] = None
    google_analytics_id: Optional[str] = None
    facebook_pixel_id: Optional[str] = None

class PWAConfigResponse(BaseModel):
    id: int
    provider_id: int
    app_name: str
    app_description: Optional[str] = None
    app_version: str
    primary_color: str
    secondary_color: str
    accent_color: str
    background_color: str
    text_color: str
    icon_192: Optional[str] = None
    icon_512: Optional[str] = None
    splash_image: Optional[str] = None
    logo_url: Optional[str] = None
    display_mode: str
    orientation: str
    theme_color: str
    welcome_message: str
    booking_instructions: Optional[str] = None
    queue_instructions: str
    enable_appointments: bool
    enable_queue: bool
    enable_notifications: bool
    enable_offline: bool
    custom_css: Optional[str] = None
    custom_js: Optional[str] = None
    google_analytics_id: Optional[str] = None
    facebook_pixel_id: Optional[str] = None

    class Config:
        from_attributes = True 