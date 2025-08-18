from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import and_, func, desc
import math
from datetime import datetime, timedelta

from app.core.database import get_db
from app.services.auth import get_current_user
from app.models.user import User
from app.models.client import Client
from app.models.appointment import Appointment
from app.schemas.client import (
    ClientCreate,
    ClientUpdate,
    ClientResponse,
    ClientListResponse,
    ClientStats,
    ClientSummary
)

router = APIRouter()

@router.get("/", response_model=ClientListResponse)
def get_clients(
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=100),
    search: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all clients for the current user's organization with pagination and filtering
    """
    try:
        # Base query - filter by organization
        query = db.query(Client).filter(Client.organization_id == current_user.organization_id)
        
        # Apply filters
        if search:
            search_term = f"%{search.strip()}%"
            query = query.filter(
                Client.name.ilike(search_term) |
                Client.email.ilike(search_term) |
                Client.phone.ilike(search_term)
            )
        
        if is_active is not None:
            query = query.filter(Client.is_active == is_active)
        
        # Get total count
        total = query.count()
        
        # Calculate pagination
        offset = (page - 1) * per_page
        total_pages = math.ceil(total / per_page)
        
        # Get paginated results, ordered by most recent first
        clients = query.order_by(desc(Client.created_at)).offset(offset).limit(per_page).all()
        
        print(f"📋 Clients requested: page {page}, per_page {per_page}, total {total}")
        
        return ClientListResponse(
            clients=[ClientResponse.model_validate(client) for client in clients],
            total=total,
            page=page,
            per_page=per_page,
            total_pages=total_pages
        )
        
    except Exception as e:
        print(f"❌ Error fetching clients: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch clients: {str(e)}")

@router.get("/summary", response_model=List[ClientSummary])
def get_clients_summary(
    search: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get simplified client list for dropdowns and selection
    """
    try:
        # Base query - filter by organization and active clients
        query = db.query(Client).filter(
            and_(
                Client.organization_id == current_user.organization_id,
                Client.is_active == True
            )
        )
        
        # Apply search filter
        if search:
            search_term = f"%{search.strip()}%"
            query = query.filter(
                Client.name.ilike(search_term) |
                Client.email.ilike(search_term) |
                Client.phone.ilike(search_term)
            )
        
        # Get results ordered by name
        clients = query.order_by(Client.name).limit(limit).all()
        
        print(f"📋 Client summary requested: {len(clients)} clients found")
        
        return [ClientSummary.model_validate(client) for client in clients]
        
    except Exception as e:
        print(f"❌ Error fetching client summary: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch client summary: {str(e)}")

@router.get("/{client_id}", response_model=ClientResponse)
def get_client(
    client_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get a specific client by ID
    """
    try:
        client = db.query(Client).filter(
            and_(
                Client.id == client_id,
                Client.organization_id == current_user.organization_id
            )
        ).first()
        
        if not client:
            raise HTTPException(status_code=404, detail="Client not found")
        
        return ClientResponse.model_validate(client)
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error fetching client {client_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch client: {str(e)}")

@router.post("/", response_model=ClientResponse, status_code=status.HTTP_201_CREATED)
def create_client(
    client_data: ClientCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a new client
    """
    try:
        # Check for duplicate client (same email or phone within organization)
        existing_client = None
        if client_data.email:
            existing_client = db.query(Client).filter(
                and_(
                    Client.email == client_data.email,
                    Client.organization_id == current_user.organization_id,
                    Client.is_active == True
                )
            ).first()
        
        if existing_client:
            raise HTTPException(status_code=400, detail="Client with this email already exists")
        
        # Create new client
        client = Client(
            organization_id=current_user.organization_id,
            **client_data.dict()
        )
        
        db.add(client)
        db.commit()
        db.refresh(client)
        
        print(f"✅ Client created: {client.name} (ID: {client.id})")
        
        return ClientResponse.model_validate(client)
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"❌ Error creating client: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create client: {str(e)}")

@router.put("/{client_id}", response_model=ClientResponse)
def update_client(
    client_id: int,
    client_data: ClientUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update an existing client
    """
    try:
        # Get existing client
        client = db.query(Client).filter(
            and_(
                Client.id == client_id,
                Client.organization_id == current_user.organization_id
            )
        ).first()
        
        if not client:
            raise HTTPException(status_code=404, detail="Client not found")
        
        # Check for duplicate email if email is being updated
        if client_data.email and client_data.email != client.email:
            existing_client = db.query(Client).filter(
                and_(
                    Client.email == client_data.email,
                    Client.organization_id == current_user.organization_id,
                    Client.id != client_id,
                    Client.is_active == True
                )
            ).first()
            
            if existing_client:
                raise HTTPException(status_code=400, detail="Client with this email already exists")
        
        # Update client fields
        update_data = client_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(client, field, value)
        
        db.commit()
        db.refresh(client)
        
        print(f"✅ Client updated: {client.name} (ID: {client.id})")
        
        return ClientResponse.model_validate(client)
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"❌ Error updating client {client_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to update client: {str(e)}")

@router.delete("/{client_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_client(
    client_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Soft delete a client (mark as inactive)
    """
    try:
        # Get existing client
        client = db.query(Client).filter(
            and_(
                Client.id == client_id,
                Client.organization_id == current_user.organization_id
            )
        ).first()
        
        if not client:
            raise HTTPException(status_code=404, detail="Client not found")
        
        # Soft delete by marking as inactive
        client.is_active = False
        
        db.commit()
        
        print(f"✅ Client soft deleted: {client.name} (ID: {client.id})")
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"❌ Error deleting client {client_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete client: {str(e)}")

@router.get("/stats/overview", response_model=ClientStats)
def get_client_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get client statistics for the current user's organization
    """
    try:
        # Basic counts
        total_clients = db.query(Client).filter(Client.organization_id == current_user.organization_id).count()
        active_clients = db.query(Client).filter(
            and_(Client.organization_id == current_user.organization_id, Client.is_active == True)
        ).count()
        
        # New clients this month
        month_start = datetime.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        new_clients_this_month = db.query(Client).filter(
            and_(
                Client.organization_id == current_user.organization_id,
                Client.created_at >= month_start
            )
        ).count()
        
        # Clients with appointments
        clients_with_appointments = db.query(Client).filter(
            and_(
                Client.organization_id == current_user.organization_id,
                Client.total_appointments > 0
            )
        ).count()
        
        # Average appointments per client
        avg_appointments = db.query(func.avg(Client.total_appointments)).filter(
            Client.organization_id == current_user.organization_id
        ).scalar() or 0.0
        
        # Top communication preference
        top_preference = db.query(Client.preferred_communication).filter(
            Client.organization_id == current_user.organization_id
        ).group_by(Client.preferred_communication).order_by(
            func.count(Client.preferred_communication).desc()
        ).first()
        
        return ClientStats(
            total_clients=total_clients,
            active_clients=active_clients,
            inactive_clients=total_clients - active_clients,
            new_clients_this_month=new_clients_this_month,
            clients_with_appointments=clients_with_appointments,
            average_appointments_per_client=round(float(avg_appointments), 2),
            top_communication_preference=top_preference[0] if top_preference else "email"
        )
        
    except Exception as e:
        print(f"❌ Error fetching client stats: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch client stats: {str(e)}")
