from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.models.appointment import Appointment
from app.models.user import User
from app.schemas.appointment import AppointmentCreate, AppointmentUpdate, AppointmentResponse
from app.services.auth import get_current_user

router = APIRouter()

@router.get("/", response_model=List[AppointmentResponse])
async def get_appointments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all appointments for the current user's organization"""
    # Get providers for the current user's organization
    from app.models.provider import Provider
    providers = db.query(Provider).filter(Provider.organization_id == current_user.organization_id).all()
    provider_ids = [p.id for p in providers]
    
    # Get appointments for those providers
    appointments = db.query(Appointment).filter(Appointment.provider_id.in_(provider_ids)).all()
    return appointments

@router.get("/{appointment_id}", response_model=AppointmentResponse)
async def get_appointment(appointment_id: int, db: Session = Depends(get_db)):
    """Get a specific appointment"""
    appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    return appointment

@router.post("/", response_model=AppointmentResponse)
async def create_appointment(
    appointment: AppointmentCreate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new appointment"""
    # Verify the provider belongs to the current user's organization
    from app.models.provider import Provider
    provider = db.query(Provider).filter(
        Provider.id == appointment.provider_id,
        Provider.organization_id == current_user.organization_id
    ).first()
    
    if not provider:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Provider not found or doesn't belong to your organization"
        )
    
    try:
        # Convert Pydantic model to dict (use model_dump for Pydantic v2)
        appointment_dict = appointment.model_dump() if hasattr(appointment, 'model_dump') else appointment.dict()
        db_appointment = Appointment(**appointment_dict)
        db.add(db_appointment)
        db.commit()
        db.refresh(db_appointment)
        
        # Automatically assign appointment to daily service queue
        from app.services.queue_manager import QueueManager
        queue_manager = QueueManager(db)
        assigned_queue = queue_manager.assign_appointment_to_queue(db_appointment)
        
        if assigned_queue:
            print(f"✅ Appointment {db_appointment.id} assigned to queue: {assigned_queue.name}")
        
        return db_appointment
    except Exception as e:
        db.rollback()
        print(f"🚨 Error creating appointment: {e}")
        print(f"🚨 Appointment data: {appointment}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create appointment: {str(e)}"
        )

@router.put("/{appointment_id}", response_model=AppointmentResponse)
async def update_appointment(appointment_id: int, appointment: AppointmentUpdate, db: Session = Depends(get_db)):
    """Update an appointment"""
    db_appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not db_appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    for field, value in appointment.dict(exclude_unset=True).items():
        setattr(db_appointment, field, value)
    
    db.commit()
    db.refresh(db_appointment)
    return db_appointment

@router.delete("/{appointment_id}")
async def delete_appointment(appointment_id: int, db: Session = Depends(get_db)):
    """Delete an appointment"""
    appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    db.delete(appointment)
    db.commit()
    return {"message": "Appointment deleted successfully"}

# Client PWA endpoints
@router.get("/client", response_model=List[AppointmentResponse])
async def get_client_appointments(db: Session = Depends(get_db)):
    """Get appointments for a client (used by client PWA)"""
    # This endpoint would normally use client authentication
    # For now, we'll return all appointments as a placeholder
    # TODO: Implement client authentication and filter by client
    appointments = db.query(Appointment).all()
    return appointments 