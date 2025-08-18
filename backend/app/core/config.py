from pydantic_settings import BaseSettings
from typing import List, Optional
import os
import secrets

class Settings(BaseSettings):
    # Environment
    ENVIRONMENT: str = "development"
    DEBUG: bool = False
    
    # Database - Use SQLite for development, PostgreSQL for production
    DATABASE_URL: str = "sqlite:///./waitlessq.db" if os.getenv("ENVIRONMENT", "development") == "development" else "postgresql://waitlessq_user:waitlessq_password@localhost:5432/waitlessq"
    READ_DATABASE_URL: Optional[str] = None  # Read replica URL
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379"
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_DB: int = 0
    REDIS_PASSWORD: Optional[str] = None
    
    # Security - Use environment variables with secure defaults
    SECRET_KEY: str = os.getenv("SECRET_KEY", secrets.token_urlsafe(32))
    JWT_SECRET: str = os.getenv("JWT_SECRET", secrets.token_urlsafe(32))
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # CORS - Restrictive by default, configurable via environment
    CORS_ORIGINS: List[str] = []
    
    # File Upload
    MAX_FILE_SIZE: int = 10 * 1024 * 1024  # 10MB
    UPLOAD_DIR: str = "uploads"
    
    # Email Configuration
    SMTP_SERVER: str = os.getenv("SMTP_SERVER", "smtp.gmail.com")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USERNAME: str = os.getenv("SMTP_USERNAME", "")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
    FROM_EMAIL: str = os.getenv("FROM_EMAIL", "")
    FROM_NAME: str = os.getenv("FROM_NAME", "WaitLessQ")
    
    # Client System Configuration
    CLIENT_JWT_SECRET_KEY: str = os.getenv("CLIENT_JWT_SECRET_KEY", secrets.token_urlsafe(32))
    CLIENT_ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("CLIENT_ACCESS_TOKEN_EXPIRE_MINUTES", "10080"))  # 7 days
    CLIENT_INVITATION_EXPIRE_DAYS: int = int(os.getenv("CLIENT_INVITATION_EXPIRE_DAYS", "7"))
    PWA_BASE_URL: str = os.getenv("PWA_BASE_URL", "https://app.waitlessq.com")
    
    # Scaling and Performance
    # Rate Limiting
    RATE_LIMIT_PER_MINUTE: int = 100
    RATE_LIMIT_PER_HOUR: int = 1000
    
    # Caching
    CACHE_TTL: int = 300  # 5 minutes default
    CACHE_ENABLED: bool = True
    
    # Background Jobs
    CELERY_BROKER_URL: str = "redis://localhost:6379/1"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/2"
    
    # Monitoring
    ENABLE_METRICS: bool = True
    METRICS_PORT: int = 8001
    
    # Logging
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    
    # WebSocket
    WS_MESSAGE_QUEUE_SIZE: int = 1000
    
    # Database Optimization
    DB_POOL_SIZE: int = 20
    DB_MAX_OVERFLOW: int = 30
    DB_POOL_TIMEOUT: int = 30
    DB_POOL_RECYCLE: int = 3600
    
    # API Optimization
    API_RESPONSE_CACHE_TTL: int = 60  # 1 minute
    API_MAX_PAGE_SIZE: int = 100
    
    # PWA Generation
    PWA_GENERATION_TIMEOUT: int = 30  # seconds
    PWA_STORAGE_PATH: str = "/app/storage"
    
    # Health Checks
    HEALTH_CHECK_TIMEOUT: int = 5  # seconds
    
    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT.lower() == "production"
    
    @property
    def is_development(self) -> bool:
        return self.ENVIRONMENT.lower() == "development"

    class Config:
        env_file = ".env"
        case_sensitive = True
        
        @classmethod
        def parse_env_var(cls, field_name: str, raw_val: str):
            if field_name == "CORS_ORIGINS":
                if raw_val:
                    return [origin.strip() for origin in raw_val.split(",")]
                return []
            return raw_val

settings = Settings()

# Validate critical settings in production
if settings.is_production:
    if settings.SECRET_KEY == "your-super-secret-key-change-in-production":
        raise ValueError("SECRET_KEY must be set in production environment")
    if settings.JWT_SECRET == "your-jwt-secret-key-change-in-production":
        raise ValueError("JWT_SECRET must be set in production environment")
    if not settings.CORS_ORIGINS:
        raise ValueError("CORS_ORIGINS must be configured in production environment")
    if "sqlite" in settings.DATABASE_URL.lower():
        raise ValueError("SQLite is not allowed in production. Use PostgreSQL.") 