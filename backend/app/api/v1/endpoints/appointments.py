from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from backend.app.core.database import get_db
from backend.app.models.appointment import Appointment
from backend.app.schemas.appointment import AppointmentCreate, AppointmentUpdate, AppointmentResponse

router = APIRouter()

@router.get("/", response_model=List[AppointmentResponse])
async def get_appointments(db: Session = Depends(get_db)):
    """Get all appointments"""
    appointments = db.query(Appointment).all()
    return appointments

@router.get("/{appointment_id}", response_model=AppointmentResponse)
async def get_appointment(appointment_id: int, db: Session = Depends(get_db)):
    """Get a specific appointment"""
    appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    return appointment

@router.post("/", response_model=AppointmentResponse)
async def create_appointment(appointment: AppointmentCreate, db: Session = Depends(get_db)):
    """Create a new appointment"""
    db_appointment = Appointment(**appointment.dict())
    db.add(db_appointment)
    db.commit()
    db.refresh(db_appointment)
    return db_appointment

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