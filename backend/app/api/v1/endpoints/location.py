from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from typing import List, Optional
import math
from datetime import datetime, timedelta

from app.core.database import get_db
from app.models.location import LocationTracking, ProviderOfficeLocation
from app.models.appointment import Appointment
from app.models.provider import Provider
from app.models.user import User
from app.schemas.location import (
    LocationTrackingCreate, LocationTrackingUpdate, LocationTrackingResponse,
    ProviderOfficeLocationCreate, ProviderOfficeLocationUpdate, ProviderOfficeLocationResponse,
    LocationStatusResponse, TravelTimeRequest, TravelTimeResponse
)
from app.services.auth import get_current_user

router = APIRouter()

def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance between two points using Haversine formula"""
    R = 6371000  # Earth's radius in meters
    
    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    delta_lat = math.radians(lat2 - lat1)
    delta_lon = math.radians(lon2 - lon1)
    
    a = (math.sin(delta_lat / 2) ** 2 +
         math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    
    return R * c

def estimate_travel_time(distance_meters: float, transport_mode: str = "driving") -> int:
    """Estimate travel time based on distance and transport mode"""
    # Simple estimation - in real app, you'd use Google Maps API or similar
    if transport_mode == "walking":
        # Average walking speed: 5 km/h
        speed_ms = 5000 / 3600  # 1.39 m/s
    elif transport_mode == "transit":
        # Average transit speed: 25 km/h (including stops)
        speed_ms = 25000 / 3600  # 6.94 m/s
    else:  # driving
        # Average driving speed in city: 40 km/h
        speed_ms = 40000 / 3600  # 11.11 m/s
    
    travel_time_seconds = distance_meters / speed_ms
    # Add buffer time (20% for traffic, stops, etc.)
    travel_time_minutes = int((travel_time_seconds / 60) * 1.2)
    
    return max(travel_time_minutes, 1)  # At least 1 minute

def determine_location_status(
    distance_to_appointment: float,
    is_moving: bool,
    user_type: str,
    distance_from_office: Optional[float] = None
) -> str:
    """Determine location status based on distance and movement"""
    if user_type == "client":
        if distance_to_appointment < 100:  # Within 100 meters
            return "arrived"
        elif distance_to_appointment < 1000 and is_moving:  # Within 1km and moving
            return "on_the_way"
        else:
            return "unknown"
    else:  # provider
        if distance_from_office and distance_from_office < 100:  # Within 100 meters of office
            return "at_office"
        else:
            return "away_from_office"

@router.post("/track", response_model=LocationTrackingResponse)
async def track_location(
    location_data: LocationTrackingCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Track location for an appointment"""
    # Verify appointment exists and user has access
    appointment = db.query(Appointment).filter(Appointment.id == location_data.appointment_id).first()
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    # Get appointment location (provider's office)
    provider = db.query(Provider).filter(Provider.id == appointment.provider_id).first()
    office_location = db.query(ProviderOfficeLocation).filter(
        ProviderOfficeLocation.provider_id == provider.id,
        ProviderOfficeLocation.is_primary == True
    ).first()
    
    # Calculate distances
    distance_to_appointment = None
    distance_from_office = None
    office_lat, office_lon = None, None
    
    if office_location:
        office_lat, office_lon = office_location.latitude, office_location.longitude
        distance_to_appointment = calculate_distance(
            location_data.latitude, location_data.longitude,
            office_lat, office_lon
        )
        if location_data.user_type == "provider":
            distance_from_office = distance_to_appointment
    
    # Determine if user is moving (simple check based on speed)
    is_moving = (location_data.speed or 0) > 0.5  # Moving if speed > 0.5 m/s
    
    # Determine status
    status = determine_location_status(
        distance_to_appointment or 0,
        is_moving,
        location_data.user_type,
        distance_from_office
    )
    
    # Calculate estimated travel time
    estimated_travel_time = None
    if distance_to_appointment:
        estimated_travel_time = estimate_travel_time(distance_to_appointment)
    
    # Check for existing tracking record
    existing_tracking = db.query(LocationTracking).filter(
        LocationTracking.appointment_id == location_data.appointment_id,
        LocationTracking.user_type == location_data.user_type
    ).first()
    
    if existing_tracking:
        # Update existing record
        for field, value in location_data.dict().items():
            if hasattr(existing_tracking, field):
                setattr(existing_tracking, field, value)
        
        existing_tracking.status = status
        existing_tracking.distance_to_appointment = distance_to_appointment
        existing_tracking.estimated_travel_time = estimated_travel_time
        existing_tracking.is_moving = is_moving
        existing_tracking.office_latitude = office_lat
        existing_tracking.office_longitude = office_lon
        existing_tracking.distance_from_office = distance_from_office
        existing_tracking.ip_address = str(request.client.host)
        existing_tracking.updated_at = datetime.utcnow()
        
        db.commit()
        db.refresh(existing_tracking)
        return existing_tracking
    else:
        # Create new tracking record
        db_tracking = LocationTracking(
            **location_data.dict(),
            status=status,
            distance_to_appointment=distance_to_appointment,
            estimated_travel_time=estimated_travel_time,
            is_moving=is_moving,
            office_latitude=office_lat,
            office_longitude=office_lon,
            distance_from_office=distance_from_office,
            ip_address=str(request.client.host)
        )
        
        db.add(db_tracking)
        db.commit()
        db.refresh(db_tracking)
        return db_tracking

@router.get("/appointment/{appointment_id}/status", response_model=LocationStatusResponse)
async def get_appointment_location_status(
    appointment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get location status for an appointment"""
    appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    # Get client and provider location tracking
    client_tracking = db.query(LocationTracking).filter(
        LocationTracking.appointment_id == appointment_id,
        LocationTracking.user_type == "client"
    ).order_by(LocationTracking.updated_at.desc()).first()
    
    provider_tracking = db.query(LocationTracking).filter(
        LocationTracking.appointment_id == appointment_id,
        LocationTracking.user_type == "provider"
    ).order_by(LocationTracking.updated_at.desc()).first()
    
    response = LocationStatusResponse(
        appointment_id=appointment_id,
        client_status=client_tracking.status if client_tracking else None,
        client_distance=client_tracking.distance_to_appointment if client_tracking else None,
        client_eta=client_tracking.estimated_travel_time if client_tracking else None,
        client_is_moving=client_tracking.is_moving if client_tracking else False,
        provider_status=provider_tracking.status if provider_tracking else None,
        provider_distance_from_office=provider_tracking.distance_from_office if provider_tracking else None,
        provider_at_office=(provider_tracking.status == "at_office") if provider_tracking else False,
        last_updated=max(
            client_tracking.updated_at if client_tracking else datetime.min,
            provider_tracking.updated_at if provider_tracking else datetime.min
        ) if (client_tracking or provider_tracking) else None
    )
    
    return response

@router.post("/office-locations", response_model=ProviderOfficeLocationResponse)
async def create_office_location(
    office_data: ProviderOfficeLocationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a provider office location"""
    # Verify provider belongs to current user's organization
    provider = db.query(Provider).filter(
        Provider.id == office_data.provider_id,
        Provider.organization_id == current_user.organization_id
    ).first()
    
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")
    
    # If this is marked as primary, unmark other primary locations
    if office_data.is_primary:
        db.query(ProviderOfficeLocation).filter(
            ProviderOfficeLocation.provider_id == office_data.provider_id,
            ProviderOfficeLocation.is_primary == True
        ).update({"is_primary": False})
    
    db_location = ProviderOfficeLocation(**office_data.dict())
    db.add(db_location)
    db.commit()
    db.refresh(db_location)
    return db_location

@router.get("/office-locations/{provider_id}", response_model=List[ProviderOfficeLocationResponse])
async def get_office_locations(
    provider_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get office locations for a provider"""
    # Verify provider belongs to current user's organization
    provider = db.query(Provider).filter(
        Provider.id == provider_id,
        Provider.organization_id == current_user.organization_id
    ).first()
    
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")
    
    locations = db.query(ProviderOfficeLocation).filter(
        ProviderOfficeLocation.provider_id == provider_id,
        ProviderOfficeLocation.is_active == True
    ).all()
    
    return locations

@router.post("/estimate-travel-time", response_model=TravelTimeResponse)
async def estimate_travel_time_endpoint(
    travel_request: TravelTimeRequest,
    current_user: User = Depends(get_current_user)
):
    """Estimate travel time between two points"""
    distance = calculate_distance(
        travel_request.from_latitude, travel_request.from_longitude,
        travel_request.to_latitude, travel_request.to_longitude
    )
    
    duration = estimate_travel_time(distance, travel_request.transport_mode)
    estimated_arrival = datetime.utcnow() + timedelta(minutes=duration)
    
    return TravelTimeResponse(
        distance_meters=distance,
        duration_minutes=duration,
        transport_mode=travel_request.transport_mode,
        estimated_arrival=estimated_arrival
    )
