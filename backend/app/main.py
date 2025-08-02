from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.trustedhost import TrustedHostMiddleware
import os
import logging

from backend.app.core.config import settings
from backend.app.api.v1.api import api_router
from backend.app.core.database import primary_engine
from backend.app.models import Base

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

# CORS middleware - Environment-aware configuration
cors_origins = settings.CORS_ORIGINS
if settings.is_development and not cors_origins:
    # Default development origins
    cors_origins = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001"
    ]

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