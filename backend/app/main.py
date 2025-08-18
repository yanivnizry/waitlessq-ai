from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.trustedhost import TrustedHostMiddleware
import os
import logging

from app.core.config import settings
from app.api.v1.api import api_router
from app.core.database import primary_engine
from app.models import Base
from app.core.middleware import RateLimitMiddleware, SecurityMiddleware

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL),
    format=settings.LOG_FORMAT
)
logger = logging.getLogger(__name__)

# Create database tables
Base.metadata.create_all(bind=primary_engine)

app = FastAPI(
    title="WaitLessQ API",
    description="Service Provider Platform API",
    version="1.0.0",
    docs_url="/docs" if not settings.is_production else None,
    redoc_url="/redoc" if not settings.is_production else None
)

# Security middleware - Trusted Host
if settings.is_production:
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=["api.yourdomain.com", "*.yourdomain.com"]
    )

# Add security middleware
app.add_middleware(SecurityMiddleware)

# Add rate limiting middleware
app.add_middleware(RateLimitMiddleware)

# CORS middleware - Environment-aware configuration
cors_origins = settings.CORS_ORIGINS
if settings.is_development and not cors_origins:
    # Default development origins - ONLY for development
    cors_origins = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

# In production, CORS_ORIGINS must be explicitly set
if settings.is_production and not cors_origins:
    raise ValueError("CORS_ORIGINS must be configured in production environment")

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(api_router, prefix="/api/v1")

# Mount static files for PWA assets
if os.path.exists("static"):
    app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/")
async def root():
    return {
        "message": "WaitLessQ API", 
        "version": "1.0.0",
        "environment": settings.ENVIRONMENT
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "environment": settings.ENVIRONMENT,
        "version": "1.0.0"
    } 