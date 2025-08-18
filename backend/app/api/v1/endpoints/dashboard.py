from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from datetime import datetime, timedelta
from sqlalchemy import func

from app.core.database import get_db
from app.services.auth import get_current_user
from app.models.user import User
from app.models.appointment import Appointment
from app.models.provider import Provider
from app.models.queue import Queue, QueueStatus

router = APIRouter()

@router.get("/stats")
async def get_dashboard_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Get dashboard statistics for the current user's organization"""
    
    # Get counts for the user's organization
    total_providers = db.query(Provider).filter(
        Provider.organization_id == current_user.organization_id
    ).count()
    
    # For appointments, we need to join with providers since appointments don't have organization_id directly
    total_appointments = db.query(Appointment).join(Provider).filter(
        Provider.organization_id == current_user.organization_id
    ).count()
    
    active_queues = db.query(Queue).join(Provider).filter(
        Provider.organization_id == current_user.organization_id,
        Queue.status == QueueStatus.ACTIVE
    ).count()
    
    # Get today's appointments
    today = datetime.now().date()
    tomorrow = today + timedelta(days=1)
    today_appointments = db.query(Appointment).join(Provider).filter(
        Provider.organization_id == current_user.organization_id,
        func.date(Appointment.scheduled_at) == today
    ).count()
    
    return {
        "total_providers": total_providers,
        "total_appointments": total_appointments,
        "active_queues": active_queues,
        "today_appointments": today_appointments,
        "organization_name": current_user.organization.name if current_user.organization else "N/A"
    }

@router.get("/recent-activity")
async def get_recent_activity(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> List[Dict[str, Any]]:
    """Get recent activity for the dashboard"""
    
    # Get recent appointments (last 7 days)
    week_ago = datetime.now() - timedelta(days=7)
    recent_appointments = db.query(Appointment).join(Provider).filter(
        Provider.organization_id == current_user.organization_id,
        Appointment.created_at >= week_ago
    ).order_by(Appointment.created_at.desc()).limit(10).all()
    
    activity = []
    for appointment in recent_appointments:
        activity.append({
            "id": appointment.id,
            "type": "appointment",
            "title": f"Appointment scheduled",
            "description": f"Appointment for {appointment.client_name}",
            "timestamp": appointment.created_at.isoformat(),
            "status": appointment.status.value
        })
    
    # Sort by timestamp (most recent first)
    activity.sort(key=lambda x: x["timestamp"], reverse=True)
    
    return activity

@router.get("/upcoming-appointments")
async def get_upcoming_appointments(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> List[Dict[str, Any]]:
    """Get upcoming appointments for the dashboard"""
    
    # Get appointments for the next 7 days
    today = datetime.now()
    next_week = today + timedelta(days=7)
    
    upcoming_appointments = db.query(Appointment).join(Provider).filter(
        Provider.organization_id == current_user.organization_id,
        Appointment.scheduled_at >= today,
        Appointment.scheduled_at <= next_week,
        Appointment.status.in_(["scheduled", "confirmed"])
    ).order_by(Appointment.scheduled_at).limit(10).all()
    
    appointments = []
    for appointment in upcoming_appointments:
        appointments.append({
            "id": appointment.id,
            "client_name": appointment.client_name,
            "client_phone": appointment.client_phone,
            "scheduled_at": appointment.scheduled_at.isoformat(),
            "status": appointment.status.value,
            "provider_id": appointment.provider_id,
            "service_name": appointment.service_name,
            "duration": appointment.duration,
            "notes": appointment.notes
        })
    
    return appointments
