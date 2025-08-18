from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import and_, func
import math

from app.core.database import get_db
from app.services.auth import get_current_user
from app.models.user import User
from app.models.service import Service
from app.models.provider import Provider
from app.models.appointment import Appointment
from app.schemas.service import (
    ServiceCreate, 
    ServiceUpdate, 
    ServiceResponse, 
    ServiceListResponse,
    ServiceStats
)

router = APIRouter()

@router.get("/", response_model=ServiceListResponse)
def get_services(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    provider_id: Optional[int] = Query(None),
    is_active: Optional[bool] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all services for the current user's organization with pagination and filtering
    """
    try:
        # Base query - filter by organization
        query = db.query(Service).filter(Service.organization_id == current_user.organization_id)
        
        # Apply filters
        if search:
            search_term = f"%{search.strip()}%"
            query = query.filter(
                Service.name.ilike(search_term) |
                Service.description.ilike(search_term)
            )
        
        if category and category.lower() != 'all':
            query = query.filter(Service.category == category)
        
        if provider_id:
            query = query.filter(
                (Service.provider_id == provider_id) |
                (Service.provider_id.is_(None))  # Services available to all providers
            )
        
        if is_active is not None:
            query = query.filter(Service.is_active == is_active)
        
        # Debug: Log query parameters
        print(f"🔍 Service query filters: search='{search}', category='{category}', provider_id={provider_id}, is_active={is_active}")
        print(f"🔍 Organization ID: {current_user.organization_id}")
        
        # Get total count
        total = query.count()
        print(f"🔍 Total services found: {total}")
        
        # Calculate pagination
        offset = (page - 1) * per_page
        total_pages = math.ceil(total / per_page)
        
        # Get paginated results
        services = query.offset(offset).limit(per_page).all()
        print(f"🔍 Services returned: {len(services)}")
        
        # Enhance with additional data
        service_responses = []
        for service in services:
            service_dict = {
                "id": service.id,
                "organization_id": service.organization_id,
                "provider_id": service.provider_id,
                "name": service.name,
                "description": service.description,
                "category": service.category,
                "duration": service.duration,
                "price": service.price,
                "is_active": service.is_active,
                "requires_approval": service.requires_approval,
                "max_advance_booking_days": service.max_advance_booking_days,
                "buffer_time_before": service.buffer_time_before,
                "buffer_time_after": service.buffer_time_after,
                "is_online_bookable": service.is_online_bookable,
                "max_slots_per_day": service.max_slots_per_day,
                "preparation_instructions": service.preparation_instructions,
                "cancellation_policy": service.cancellation_policy,
                "created_at": service.created_at,
                "updated_at": service.updated_at,
                "provider_name": None,
                "total_appointments": 0
            }
            
            # Get provider name if assigned
            if service.provider_id:
                provider = db.query(Provider).filter(Provider.id == service.provider_id).first()
                if provider:
                    service_dict["provider_name"] = provider.business_name
            
            # Get appointment count
            appointment_count = db.query(Appointment).filter(
                Appointment.service_name == service.name
            ).count()
            service_dict["total_appointments"] = appointment_count
            
            service_responses.append(ServiceResponse(**service_dict))
        
        print(f"📋 Services requested: page {page}, per_page {per_page}, total {total}")
        
        return ServiceListResponse(
            services=service_responses,
            total=total,
            page=page,
            per_page=per_page,
            total_pages=total_pages
        )
        
    except Exception as e:
        print(f"❌ Error fetching services: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch services: {str(e)}")

@router.get("/stats", response_model=ServiceStats)
def get_service_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get service statistics for the current user's organization
    """
    try:
        services = db.query(Service).filter(Service.organization_id == current_user.organization_id).all()
        
        total_services = len(services)
        active_services = len([s for s in services if s.is_active])
        inactive_services = total_services - active_services
        
        avg_price = sum(s.price for s in services) / total_services if total_services > 0 else 0
        avg_duration = sum(s.duration for s in services) / total_services if total_services > 0 else 0
        
        # Most popular category
        categories = [s.category for s in services if s.category]
        most_popular_category = max(set(categories), key=categories.count) if categories else None
        
        return ServiceStats(
            total_services=total_services,
            active_services=active_services,
            inactive_services=inactive_services,
            avg_price=round(avg_price, 2),
            avg_duration=int(avg_duration),
            most_popular_category=most_popular_category
        )
        
    except Exception as e:
        print(f"❌ Error fetching service stats: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch service stats: {str(e)}")

@router.get("/{service_id}", response_model=ServiceResponse)
def get_service(
    service_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get a specific service by ID
    """
    try:
        service = db.query(Service).filter(
            and_(
                Service.id == service_id,
                Service.organization_id == current_user.organization_id
            )
        ).first()
        
        if not service:
            raise HTTPException(status_code=404, detail="Service not found")
        
        # Enhanced response
        service_dict = {
            "id": service.id,
            "organization_id": service.organization_id,
            "provider_id": service.provider_id,
            "name": service.name,
            "description": service.description,
            "category": service.category,
            "duration": service.duration,
            "price": service.price,
            "is_active": service.is_active,
            "requires_approval": service.requires_approval,
            "max_advance_booking_days": service.max_advance_booking_days,
            "buffer_time_before": service.buffer_time_before,
            "buffer_time_after": service.buffer_time_after,
            "is_online_bookable": service.is_online_bookable,
            "max_slots_per_day": service.max_slots_per_day,
            "preparation_instructions": service.preparation_instructions,
            "cancellation_policy": service.cancellation_policy,
            "created_at": service.created_at,
            "updated_at": service.updated_at,
            "provider_name": None,
            "total_appointments": 0
        }
        
        # Get provider name if assigned
        if service.provider_id:
            provider = db.query(Provider).filter(Provider.id == service.provider_id).first()
            if provider:
                service_dict["provider_name"] = provider.business_name
        
        # Get appointment count
        appointment_count = db.query(Appointment).filter(
            Appointment.service_name == service.name
        ).count()
        service_dict["total_appointments"] = appointment_count
        
        return ServiceResponse(**service_dict)
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error fetching service {service_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch service: {str(e)}")

@router.post("/", response_model=ServiceResponse, status_code=status.HTTP_201_CREATED)
def create_service(
    service_data: ServiceCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a new service
    """
    try:
        # Check if provider exists (if specified)
        if service_data.provider_id:
            provider = db.query(Provider).filter(
                and_(
                    Provider.id == service_data.provider_id,
                    Provider.organization_id == current_user.organization_id
                )
            ).first()
            if not provider:
                raise HTTPException(status_code=404, detail="Provider not found")
        
        # Check for duplicate service name within organization
        existing_service = db.query(Service).filter(
            and_(
                Service.name == service_data.name,
                Service.organization_id == current_user.organization_id
            )
        ).first()
        
        if existing_service:
            raise HTTPException(status_code=400, detail="Service with this name already exists")
        
        # Create new service
        print(f"🔧 Creating service with organization_id: {current_user.organization_id}")
        print(f"🔧 Service data: {service_data.dict()}")
        
        service = Service(
            organization_id=current_user.organization_id,
            **service_data.dict()
        )
        
        db.add(service)
        db.commit()
        db.refresh(service)
        
        print(f"✅ Service created: {service.name} (ID: {service.id}, org_id: {service.organization_id})")
        
        # Return enhanced response
        service_dict = {
            "id": service.id,
            "organization_id": service.organization_id,
            "provider_id": service.provider_id,
            "name": service.name,
            "description": service.description,
            "category": service.category,
            "duration": service.duration,
            "price": service.price,
            "is_active": service.is_active,
            "requires_approval": service.requires_approval,
            "max_advance_booking_days": service.max_advance_booking_days,
            "buffer_time_before": service.buffer_time_before,
            "buffer_time_after": service.buffer_time_after,
            "is_online_bookable": service.is_online_bookable,
            "max_slots_per_day": service.max_slots_per_day,
            "preparation_instructions": service.preparation_instructions,
            "cancellation_policy": service.cancellation_policy,
            "created_at": service.created_at,
            "updated_at": service.updated_at,
            "provider_name": None,
            "total_appointments": 0
        }
        
        return ServiceResponse(**service_dict)
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"❌ Error creating service: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create service: {str(e)}")

@router.put("/{service_id}", response_model=ServiceResponse)
def update_service(
    service_id: int,
    service_data: ServiceUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update an existing service
    """
    try:
        # Get existing service
        service = db.query(Service).filter(
            and_(
                Service.id == service_id,
                Service.organization_id == current_user.organization_id
            )
        ).first()
        
        if not service:
            raise HTTPException(status_code=404, detail="Service not found")
        
        # Check if provider exists (if specified)
        if service_data.provider_id:
            provider = db.query(Provider).filter(
                and_(
                    Provider.id == service_data.provider_id,
                    Provider.organization_id == current_user.organization_id
                )
            ).first()
            if not provider:
                raise HTTPException(status_code=404, detail="Provider not found")
        
        # Check for duplicate name (if name is being updated)
        if service_data.name and service_data.name != service.name:
            existing_service = db.query(Service).filter(
                and_(
                    Service.name == service_data.name,
                    Service.organization_id == current_user.organization_id,
                    Service.id != service_id
                )
            ).first()
            
            if existing_service:
                raise HTTPException(status_code=400, detail="Service with this name already exists")
        
        # Update service fields
        update_data = service_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(service, field, value)
        
        db.commit()
        db.refresh(service)
        
        print(f"✅ Service updated: {service.name} (ID: {service.id})")
        
        # Return enhanced response
        service_dict = {
            "id": service.id,
            "organization_id": service.organization_id,
            "provider_id": service.provider_id,
            "name": service.name,
            "description": service.description,
            "category": service.category,
            "duration": service.duration,
            "price": service.price,
            "is_active": service.is_active,
            "requires_approval": service.requires_approval,
            "max_advance_booking_days": service.max_advance_booking_days,
            "buffer_time_before": service.buffer_time_before,
            "buffer_time_after": service.buffer_time_after,
            "is_online_bookable": service.is_online_bookable,
            "max_slots_per_day": service.max_slots_per_day,
            "preparation_instructions": service.preparation_instructions,
            "cancellation_policy": service.cancellation_policy,
            "created_at": service.created_at,
            "updated_at": service.updated_at,
            "provider_name": None,
            "total_appointments": 0
        }
        
        # Get provider name if assigned
        if service.provider_id:
            provider = db.query(Provider).filter(Provider.id == service.provider_id).first()
            if provider:
                service_dict["provider_name"] = provider.business_name
        
        return ServiceResponse(**service_dict)
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"❌ Error updating service {service_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to update service: {str(e)}")

@router.delete("/{service_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_service(
    service_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete a service
    """
    try:
        service = db.query(Service).filter(
            and_(
                Service.id == service_id,
                Service.organization_id == current_user.organization_id
            )
        ).first()
        
        if not service:
            raise HTTPException(status_code=404, detail="Service not found")
        
        # Check if service has appointments
        appointment_count = db.query(Appointment).filter(
            Appointment.service_name == service.name
        ).count()
        
        if appointment_count > 0:
            # Instead of deleting, deactivate the service
            service.is_active = False
            db.commit()
            print(f"⚠️ Service deactivated (has appointments): {service.name} (ID: {service.id})")
        else:
            # Safe to delete
            db.delete(service)
            db.commit()
            print(f"✅ Service deleted: {service.name} (ID: {service.id})")
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"❌ Error deleting service {service_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete service: {str(e)}")

@router.get("/categories/list")
def get_service_categories(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all service categories used in the organization
    """
    try:
        categories = db.query(Service.category).filter(
            and_(
                Service.organization_id == current_user.organization_id,
                Service.category.isnot(None)
            )
        ).distinct().all()
        
        category_list = [cat[0] for cat in categories if cat[0]]
        
        # Add common categories if none exist
        if not category_list:
            category_list = [
                'consultation', 'treatment', 'examination', 'therapy', 
                'check-up', 'follow-up', 'emergency', 'procedure', 'other'
            ]
        
        return {"categories": sorted(category_list)}
        
    except Exception as e:
        print(f"❌ Error fetching categories: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch categories: {str(e)}")

# Time slots endpoint
@router.get("/timeslots/{provider_id}")
def get_available_time_slots(
    provider_id: int,
    date: str,  # Format: YYYY-MM-DD
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get available time slots for a provider on a specific date
    """
    try:
        from datetime import datetime, timedelta
        
        # Parse the date
        try:
            target_date = datetime.strptime(date, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
        
        # Verify provider belongs to organization
        provider = db.query(Provider).filter(
            and_(
                Provider.id == provider_id,
                Provider.organization_id == current_user.organization_id
            )
        ).first()
        
        if not provider:
            raise HTTPException(status_code=404, detail="Provider not found")
        
        # Mock availability data (9 AM to 5 PM, 30-minute slots)
        start_hour = 9
        end_hour = 17
        slot_duration = 30  # minutes
        
        available_slots = []
        current_time = datetime.combine(target_date, datetime.min.time().replace(hour=start_hour))
        end_time = datetime.combine(target_date, datetime.min.time().replace(hour=end_hour))
        
        while current_time < end_time:
            # Check for existing appointments (simplified)
            existing_appointment = db.query(Appointment).filter(
                and_(
                    Appointment.provider_id == provider_id,
                    func.date(Appointment.scheduled_at) == target_date,
                    func.extract('hour', Appointment.scheduled_at) == current_time.hour,
                    func.extract('minute', Appointment.scheduled_at) == current_time.minute
                )
            ).first()
            
            is_available = existing_appointment is None
            
            # Mock lunch break
            if current_time.hour == 12:
                is_available = False
            
            available_slots.append({
                "time": current_time.strftime("%H:%M"),
                "datetime": current_time.isoformat(),
                "is_available": is_available,
                "duration": slot_duration
            })
            
            current_time += timedelta(minutes=slot_duration)
        
        print(f"⏰ Time slots requested for provider {provider_id} on {date}, returning {len(available_slots)} slots")
        return {
            "provider_id": provider_id,
            "provider_name": provider.business_name,
            "date": date,
            "slots": available_slots,
            "total_slots": len(available_slots),
            "available_slots": len([s for s in available_slots if s["is_available"]])
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error fetching time slots for provider {provider_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch time slots: {str(e)}")