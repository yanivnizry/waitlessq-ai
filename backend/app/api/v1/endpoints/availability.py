from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func
from datetime import date, datetime, time, timedelta
import calendar

from app.core.database import get_db
from app.services.auth import get_current_user
from app.models.user import User
from app.models.availability import Availability, AvailabilityException
from app.models.provider import Provider
from app.schemas.availability import (
    AvailabilityCreate,
    AvailabilityUpdate,
    AvailabilityResponse,
    AvailabilityExceptionCreate,
    AvailabilityExceptionUpdate,
    AvailabilityExceptionResponse,
    WeeklySchedule,
    AvailabilityStats,
    BulkAvailabilityCreate,
    DayOfWeekEnum
)

router = APIRouter()

@router.get("/provider/{provider_id}/weekly", response_model=WeeklySchedule)
def get_provider_weekly_schedule(
    provider_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get the complete weekly schedule for a provider
    """
    try:
        # Verify provider belongs to user's organization
        provider = db.query(Provider).filter(
            and_(
                Provider.id == provider_id,
                Provider.organization_id == current_user.organization_id
            )
        ).first()
        
        if not provider:
            raise HTTPException(status_code=404, detail="Provider not found")
        
        # Get all recurring availability rules
        availability_rules = db.query(Availability).filter(
            and_(
                Availability.provider_id == provider_id,
                Availability.availability_type == "recurring",
                Availability.is_active == True
            )
        ).all()
        
        # Get all exceptions
        exceptions = db.query(AvailabilityException).filter(
            and_(
                AvailabilityException.provider_id == provider_id,
                AvailabilityException.is_active == True
            )
        ).all()
        
        # Organize by day of week
        weekly_schedule = {
            "monday": [],
            "tuesday": [],
            "wednesday": [],
            "thursday": [],
            "friday": [],
            "saturday": [],
            "sunday": []
        }
        
        for rule in availability_rules:
            if rule.day_of_week and rule.day_of_week in weekly_schedule:
                rule_dict = {
                    "id": rule.id,
                    "provider_id": rule.provider_id,
                    "availability_type": rule.availability_type,
                    "day_of_week": rule.day_of_week,
                    "start_time": rule.start_time.strftime("%H:%M") if rule.start_time else None,
                    "end_time": rule.end_time.strftime("%H:%M") if rule.end_time else None,
                    "specific_date": rule.specific_date,
                    "is_available": rule.is_available,
                    "breaks": rule.breaks or [],
                    "max_bookings": rule.max_bookings,
                    "buffer_minutes": rule.buffer_minutes,
                    "is_active": rule.is_active,
                    "notes": rule.notes,
                    "priority": rule.priority,
                    "created_at": rule.created_at,
                    "updated_at": rule.updated_at,
                    "provider_name": provider.business_name
                }
                weekly_schedule[rule.day_of_week].append(AvailabilityResponse(**rule_dict))
        
        # Convert exceptions
        exception_responses = []
        for exc in exceptions:
            exc_dict = {
                "id": exc.id,
                "provider_id": exc.provider_id,
                "start_date": exc.start_date,
                "end_date": exc.end_date,
                "exception_type": exc.exception_type,
                "is_available": exc.is_available,
                "custom_hours": exc.custom_hours,
                "title": exc.title,
                "description": exc.description,
                "is_active": exc.is_active,
                "created_at": exc.created_at,
                "updated_at": exc.updated_at,
                "provider_name": provider.business_name
            }
            exception_responses.append(AvailabilityExceptionResponse(**exc_dict))
        
        return WeeklySchedule(
            provider_id=provider_id,
            **weekly_schedule,
            exceptions=exception_responses
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error fetching weekly schedule for provider {provider_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch weekly schedule: {str(e)}")

@router.post("/", response_model=AvailabilityResponse, status_code=status.HTTP_201_CREATED)
def create_availability(
    availability_data: AvailabilityCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a new availability rule
    """
    try:
        # Verify provider belongs to user's organization
        provider = db.query(Provider).filter(
            and_(
                Provider.id == availability_data.provider_id,
                Provider.organization_id == current_user.organization_id
            )
        ).first()
        
        if not provider:
            raise HTTPException(status_code=404, detail="Provider not found")
        
        # Convert time strings to time objects
        start_time = None
        end_time = None
        if availability_data.start_time:
            start_time = time.fromisoformat(availability_data.start_time)
        if availability_data.end_time:
            end_time = time.fromisoformat(availability_data.end_time)
        
        # Create availability rule
        availability = Availability(
            provider_id=availability_data.provider_id,
            availability_type=availability_data.availability_type,
            day_of_week=availability_data.day_of_week,
            start_time=start_time,
            end_time=end_time,
            specific_date=availability_data.specific_date,
            is_available=availability_data.is_available,
            breaks=[break_item.dict() for break_item in availability_data.breaks],
            max_bookings=availability_data.max_bookings,
            buffer_minutes=availability_data.buffer_minutes,
            is_active=availability_data.is_active,
            notes=availability_data.notes,
            priority=availability_data.priority
        )
        
        db.add(availability)
        db.commit()
        db.refresh(availability)
        
        print(f"✅ Availability rule created for provider {availability_data.provider_id}")
        
        # Return response
        return AvailabilityResponse(
            id=availability.id,
            provider_id=availability.provider_id,
            availability_type=availability.availability_type,
            day_of_week=availability.day_of_week,
            start_time=availability.start_time.strftime("%H:%M") if availability.start_time else None,
            end_time=availability.end_time.strftime("%H:%M") if availability.end_time else None,
            specific_date=availability.specific_date,
            is_available=availability.is_available,
            breaks=availability.breaks or [],
            max_bookings=availability.max_bookings,
            buffer_minutes=availability.buffer_minutes,
            is_active=availability.is_active,
            notes=availability.notes,
            priority=availability.priority,
            created_at=availability.created_at,
            updated_at=availability.updated_at,
            provider_name=provider.business_name
        )
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"❌ Error creating availability: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create availability: {str(e)}")

@router.put("/{availability_id}", response_model=AvailabilityResponse)
def update_availability(
    availability_id: int,
    availability_data: AvailabilityUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update an existing availability rule
    """
    try:
        # Get existing availability rule
        availability = db.query(Availability).filter(Availability.id == availability_id).first()
        if not availability:
            raise HTTPException(status_code=404, detail="Availability rule not found")
        
        # Verify provider belongs to user's organization
        provider = db.query(Provider).filter(
            and_(
                Provider.id == availability.provider_id,
                Provider.organization_id == current_user.organization_id
            )
        ).first()
        
        if not provider:
            raise HTTPException(status_code=404, detail="Provider not found")
        
        # Update fields
        update_data = availability_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            if field in ['start_time', 'end_time'] and value:
                setattr(availability, field, time.fromisoformat(value))
            elif field == 'breaks' and value:
                setattr(availability, field, [break_item.dict() for break_item in value])
            else:
                setattr(availability, field, value)
        
        db.commit()
        db.refresh(availability)
        
        print(f"✅ Availability rule {availability_id} updated")
        
        return AvailabilityResponse(
            id=availability.id,
            provider_id=availability.provider_id,
            availability_type=availability.availability_type,
            day_of_week=availability.day_of_week,
            start_time=availability.start_time.strftime("%H:%M") if availability.start_time else None,
            end_time=availability.end_time.strftime("%H:%M") if availability.end_time else None,
            specific_date=availability.specific_date,
            is_available=availability.is_available,
            breaks=availability.breaks or [],
            max_bookings=availability.max_bookings,
            buffer_minutes=availability.buffer_minutes,
            is_active=availability.is_active,
            notes=availability.notes,
            priority=availability.priority,
            created_at=availability.created_at,
            updated_at=availability.updated_at,
            provider_name=provider.business_name
        )
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"❌ Error updating availability {availability_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to update availability: {str(e)}")

@router.delete("/{availability_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_availability(
    availability_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete an availability rule
    """
    try:
        # Get existing availability rule
        availability = db.query(Availability).filter(Availability.id == availability_id).first()
        if not availability:
            raise HTTPException(status_code=404, detail="Availability rule not found")
        
        # Verify provider belongs to user's organization
        provider = db.query(Provider).filter(
            and_(
                Provider.id == availability.provider_id,
                Provider.organization_id == current_user.organization_id
            )
        ).first()
        
        if not provider:
            raise HTTPException(status_code=404, detail="Provider not found")
        
        db.delete(availability)
        db.commit()
        
        print(f"✅ Availability rule {availability_id} deleted")
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"❌ Error deleting availability {availability_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete availability: {str(e)}")

@router.post("/bulk", response_model=List[AvailabilityResponse])
def create_bulk_availability(
    bulk_data: BulkAvailabilityCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create multiple availability rules at once (useful for setting up weekly schedules)
    """
    try:
        # Verify provider belongs to user's organization
        provider = db.query(Provider).filter(
            and_(
                Provider.id == bulk_data.provider_id,
                Provider.organization_id == current_user.organization_id
            )
        ).first()
        
        if not provider:
            raise HTTPException(status_code=404, detail="Provider not found")
        
        # If replace_existing is True, delete existing rules
        if bulk_data.replace_existing:
            db.query(Availability).filter(
                and_(
                    Availability.provider_id == bulk_data.provider_id,
                    Availability.availability_type == "recurring"
                )
            ).delete()
        
        created_rules = []
        
        for rule_data in bulk_data.availability_rules:
            # Convert time strings to time objects
            start_time = None
            end_time = None
            if rule_data.start_time:
                start_time = time.fromisoformat(rule_data.start_time)
            if rule_data.end_time:
                end_time = time.fromisoformat(rule_data.end_time)
            
            availability = Availability(
                provider_id=bulk_data.provider_id,
                availability_type=rule_data.availability_type,
                day_of_week=rule_data.day_of_week,
                start_time=start_time,
                end_time=end_time,
                specific_date=rule_data.specific_date,
                is_available=rule_data.is_available,
                breaks=[break_item.dict() for break_item in rule_data.breaks],
                max_bookings=rule_data.max_bookings,
                buffer_minutes=rule_data.buffer_minutes,
                is_active=rule_data.is_active,
                notes=rule_data.notes,
                priority=rule_data.priority
            )
            
            db.add(availability)
            created_rules.append(availability)
        
        db.commit()
        
        # Refresh all created rules
        for rule in created_rules:
            db.refresh(rule)
        
        print(f"✅ Created {len(created_rules)} availability rules for provider {bulk_data.provider_id}")
        
        # Return responses
        responses = []
        for rule in created_rules:
            responses.append(AvailabilityResponse(
                id=rule.id,
                provider_id=rule.provider_id,
                availability_type=rule.availability_type,
                day_of_week=rule.day_of_week,
                start_time=rule.start_time.strftime("%H:%M") if rule.start_time else None,
                end_time=rule.end_time.strftime("%H:%M") if rule.end_time else None,
                specific_date=rule.specific_date,
                is_available=rule.is_available,
                breaks=rule.breaks or [],
                max_bookings=rule.max_bookings,
                buffer_minutes=rule.buffer_minutes,
                is_active=rule.is_active,
                notes=rule.notes,
                priority=rule.priority,
                created_at=rule.created_at,
                updated_at=rule.updated_at,
                provider_name=provider.business_name
            ))
        
        return responses
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"❌ Error creating bulk availability: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create bulk availability: {str(e)}")

# Exception endpoints
@router.post("/exceptions", response_model=AvailabilityExceptionResponse, status_code=status.HTTP_201_CREATED)
def create_availability_exception(
    exception_data: AvailabilityExceptionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create an availability exception (vacation, holiday, etc.)
    """
    try:
        # Verify provider belongs to user's organization
        provider = db.query(Provider).filter(
            and_(
                Provider.id == exception_data.provider_id,
                Provider.organization_id == current_user.organization_id
            )
        ).first()
        
        if not provider:
            raise HTTPException(status_code=404, detail="Provider not found")
        
        exception = AvailabilityException(
            provider_id=exception_data.provider_id,
            start_date=exception_data.start_date,
            end_date=exception_data.end_date,
            exception_type=exception_data.exception_type,
            is_available=exception_data.is_available,
            custom_hours=exception_data.custom_hours,
            title=exception_data.title,
            description=exception_data.description,
            is_active=exception_data.is_active
        )
        
        db.add(exception)
        db.commit()
        db.refresh(exception)
        
        print(f"✅ Availability exception created for provider {exception_data.provider_id}")
        
        return AvailabilityExceptionResponse(
            id=exception.id,
            provider_id=exception.provider_id,
            start_date=exception.start_date,
            end_date=exception.end_date,
            exception_type=exception.exception_type,
            is_available=exception.is_available,
            custom_hours=exception.custom_hours,
            title=exception.title,
            description=exception.description,
            is_active=exception.is_active,
            created_at=exception.created_at,
            updated_at=exception.updated_at,
            provider_name=provider.business_name
        )
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"❌ Error creating availability exception: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create availability exception: {str(e)}")

@router.get("/provider/{provider_id}/stats", response_model=AvailabilityStats)
def get_availability_stats(
    provider_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get availability statistics for a provider
    """
    try:
        # Verify provider belongs to user's organization
        provider = db.query(Provider).filter(
            and_(
                Provider.id == provider_id,
                Provider.organization_id == current_user.organization_id
            )
        ).first()
        
        if not provider:
            raise HTTPException(status_code=404, detail="Provider not found")
        
        # Get availability statistics
        total_rules = db.query(Availability).filter(Availability.provider_id == provider_id).count()
        active_rules = db.query(Availability).filter(
            and_(Availability.provider_id == provider_id, Availability.is_active == True)
        ).count()
        
        total_exceptions = db.query(AvailabilityException).filter(
            AvailabilityException.provider_id == provider_id
        ).count()
        active_exceptions = db.query(AvailabilityException).filter(
            and_(AvailabilityException.provider_id == provider_id, AvailabilityException.is_active == True)
        ).count()
        
        # Calculate coverage percentage (simplified)
        available_days = db.query(Availability).filter(
            and_(
                Availability.provider_id == provider_id,
                Availability.availability_type == "recurring",
                Availability.is_active == True,
                Availability.is_available == True
            )
        ).count()
        
        coverage_percentage = (available_days / 7) * 100 if available_days > 0 else 0
        
        return AvailabilityStats(
            total_availability_rules=total_rules,
            active_rules=active_rules,
            inactive_rules=total_rules - active_rules,
            total_exceptions=total_exceptions,
            active_exceptions=active_exceptions,
            coverage_percentage=min(coverage_percentage, 100),
            most_available_day="monday",  # TODO: Calculate from actual data
            least_available_day="sunday"   # TODO: Calculate from actual data
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error fetching availability stats for provider {provider_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch availability stats: {str(e)}")
