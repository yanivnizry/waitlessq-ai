from pydantic_settings import BaseSettings
from typing import List, Optional
import os

class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql://waitlessq_user:waitlessq_password@localhost:5432/waitlessq"
    READ_DATABASE_URL: Optional[str] = None  # Read replica URL
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379"
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_DB: int = 0
    REDIS_PASSWORD: Optional[str] = None
    
    # Security
    SECRET_KEY: str = "your-super-secret-key-change-in-production"
    JWT_SECRET: str = "your-jwt-secret-key-change-in-production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # CORS - Flexible configuration for development
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000", 
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "http://192.168.0.169:3000",
        "http://192.168.0.169:3001",
        "http://0.0.0.0:3000",
        "http://0.0.0.0:3001",
        # Allow any local network IP for development
        "http://192.168.*:3000",
        "http://192.168.*:3001",
        "http://10.*:3000",
        "http://10.*:3001",
        "http://172.*:3000",
        "http://172.*:3001"
    ]
    
    # File Upload
    MAX_FILE_SIZE: int = 10 * 1024 * 1024  # 10MB
    UPLOAD_DIR: str = "uploads"
    
    # PWA Settings
    PWA_BASE_URL: str = "http://localhost:5001"
    
    # Email (for future use)
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    
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
    
    class Config:
        env_file = ".env"
        case_sensitive = True
        
        @classmethod
        def parse_env_var(cls, field_name: str, raw_val: str):
            if field_name == "CORS_ORIGINS":
                if raw_val:
                    return [origin.strip() for origin in raw_val.split(",")]
                return [
                    "http://localhost:3000", 
                    "http://localhost:3001",
                    "http://127.0.0.1:3000",
                    "http://127.0.0.1:3001",
                    "http://192.168.0.169:3000",
                    "http://192.168.0.169:3001",
                    "http://0.0.0.0:3000",
                    "http://0.0.0.0:3001",
                    # Allow any local network IP for development
                    "http://192.168.*:3000",
                    "http://192.168.*:3001",
                    "http://10.*:3000",
                    "http://10.*:3001",
                    "http://172.*:3000",
                    "http://172.*:3001"
                ]
            return raw_val

settings = Settings() 