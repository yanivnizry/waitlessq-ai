from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from backend.app.core.config import settings
from backend.app.api.v1.api import api_router
from backend.app.core.database import primary_engine
from backend.app.models import Base

# Create database tables
Base.metadata.create_all(bind=primary_engine)

app = FastAPI(
    title="WaitLessQ API",
    description="Service Provider Platform API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware - More permissive for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins in development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(api_router, prefix="/api/v1")

# Mount static files for PWA assets
if os.path.exists("static"):
    app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/")
async def root():
    return {"message": "WaitLessQ API", "version": "1.0.0"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"} 