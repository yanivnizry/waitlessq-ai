from fastapi import APIRouter
from backend.app.api.v1.endpoints import auth, providers, appointments, queues, pwa

api_router = APIRouter()

# Include all endpoint routers
api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])
api_router.include_router(providers.router, prefix="/providers", tags=["providers"])
api_router.include_router(appointments.router, prefix="/appointments", tags=["appointments"])
api_router.include_router(queues.router, prefix="/queues", tags=["queues"])
api_router.include_router(pwa.router, prefix="/pwa", tags=["pwa"]) 