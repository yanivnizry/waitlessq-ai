from fastapi import APIRouter
from app.api.v1.endpoints import auth, providers, queues, appointments, pwa, organizations, dashboard, services, availability, clients

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
api_router.include_router(organizations.router, prefix="/organizations", tags=["organizations"])
api_router.include_router(providers.router, prefix="/providers", tags=["providers"])
api_router.include_router(services.router, prefix="/services", tags=["services"])
api_router.include_router(clients.router, prefix="/clients", tags=["clients"])
api_router.include_router(availability.router, prefix="/availability", tags=["availability"])
api_router.include_router(queues.router, prefix="/queues", tags=["queues"])
api_router.include_router(appointments.router, prefix="/appointments", tags=["appointments"])
api_router.include_router(pwa.router, prefix="/pwa", tags=["pwa"]) 