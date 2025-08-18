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
    ClientSummary,
    ClientInvitation,
    ClientInvitationResponse,
    ClientRegistration,
    ClientRegistrationResponse,
    ClientLoginRequest,
    ClientLoginResponse
)
from app.services.client_invitation import client_invitation_service
# client_auth_service imported lazily to avoid JWT module loading issues

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
        
        # Automatically send invitation if client has email
        if client.email:
            try:
                success, message = client_invitation_service.send_client_invitation(
                    client_id=client.id,
                    db=db
                )
                if success:
                    print(f"📧 Invitation sent to {client.email}")
                else:
                    print(f"⚠️ Failed to send invitation to {client.email}: {message}")
            except Exception as e:
                print(f"⚠️ Error sending invitation to {client.email}: {str(e)}")
        
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


# Client Invitation Endpoints

@router.post("/{client_id}/invite", response_model=ClientInvitationResponse)
def send_client_invitation(
    client_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Send invitation email to a client to create their PWA account
    """
    try:
        # Verify client belongs to current user's organization
        client = db.query(Client).filter(
            and_(
                Client.id == client_id,
                Client.organization_id == current_user.organization_id
            )
        ).first()
        
        if not client:
            raise HTTPException(status_code=404, detail="Client not found")
        
        # Send invitation
        success, message = client_invitation_service.send_client_invitation(
            client_id=client_id,
            db=db
        )
        
        if success:
            # Refresh client to get updated invitation fields
            db.refresh(client)
            return ClientInvitationResponse(
                success=True,
                message=message,
                invitation_sent_at=client.invitation_sent_at,
                invitation_expires_at=client.invitation_expires_at
            )
        else:
            return ClientInvitationResponse(
                success=False,
                message=message
            )
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error sending invitation to client {client_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to send invitation: {str(e)}")


@router.post("/{client_id}/resend-invite", response_model=ClientInvitationResponse)
def resend_client_invitation(
    client_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Resend invitation email to a client
    """
    try:
        # Verify client belongs to current user's organization
        client = db.query(Client).filter(
            and_(
                Client.id == client_id,
                Client.organization_id == current_user.organization_id
            )
        ).first()
        
        if not client:
            raise HTTPException(status_code=404, detail="Client not found")
        
        # Resend invitation
        success, message = client_invitation_service.resend_invitation(
            client_id=client_id,
            db=db
        )
        
        if success:
            # Refresh client to get updated invitation fields
            db.refresh(client)
            return ClientInvitationResponse(
                success=True,
                message=message,
                invitation_sent_at=client.invitation_sent_at,
                invitation_expires_at=client.invitation_expires_at
            )
        else:
            return ClientInvitationResponse(
                success=False,
                message=message
            )
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error resending invitation to client {client_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to resend invitation: {str(e)}")


# Client Registration and Authentication Endpoints (for PWA)

@router.post("/register", response_model=ClientRegistrationResponse)
def register_client(
    registration_data: ClientRegistration,
    db: Session = Depends(get_db)
):
    """
    Register a new client account using invitation token (for PWA)
    """
    try:
        # Validate passwords match
        if registration_data.password != registration_data.confirm_password:
            raise HTTPException(status_code=400, detail="Passwords do not match")
        
        # Complete registration
        success, message, client_data = client_invitation_service.complete_client_registration(
            token=registration_data.invitation_token,
            password=registration_data.password,
            db=db
        )
        
        if success:
            return ClientRegistrationResponse(
                success=True,
                message=message,
                client_id=client_data["client_id"],
                access_token=client_data["access_token"]
            )
        else:
            return ClientRegistrationResponse(
                success=False,
                message=message,
                client_id=0
            )
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error registering client: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to register client: {str(e)}")


@router.post("/login", response_model=ClientLoginResponse)
def login_client(
    login_data: ClientLoginRequest,
    db: Session = Depends(get_db)
):
    """
    Login client for PWA access
    """
    try:
        from app.services.client_auth import client_auth_service  # Lazy import
        
        # Authenticate client
        client = client_auth_service.authenticate_client(
            email=login_data.email,
            password=login_data.password,
            db=db
        )
        
        if not client:
            raise HTTPException(status_code=401, detail="Invalid email or password")
        
        # Create access token
        access_token = client_auth_service.create_access_token(
            client_id=client.id,
            email=client.email
        )
        
        # Get providers this client has appointments with
        # (We'll implement this logic to get the list of providers)
        providers = []  # TODO: Implement provider list logic
        
        return ClientLoginResponse(
            success=True,
            message="Login successful",
            access_token=access_token,
            client=ClientResponse.model_validate(client),
            providers=providers
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error logging in client: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to login: {str(e)}")


@router.get("/validate-token/{token}")
def validate_invitation_token(
    token: str,
    db: Session = Depends(get_db)
):
    """
    Validate an invitation token (for PWA registration page)
    """
    try:
        client = client_invitation_service.validate_invitation_token(token, db)
        
        if client:
            return {
                "valid": True,
                "client_name": client.name,
                "client_email": client.email
            }
        else:
            return {
                "valid": False,
                "message": "Invalid or expired invitation token"
            }
            
    except Exception as e:
        print(f"❌ Error validating token: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to validate token: {str(e)}")

@router.get("/me")
def get_current_client_data(db: Session = Depends(get_db)):
    """Get current client data (placeholder for client PWA)"""
    # TODO: Implement proper client authentication
    # For now, return mock data
    return {
        "client": {
            "id": 1,
            "name": "Demo Client",
            "email": "demo@example.com",
            "phone": "+1234567890",
            "has_account": True,
            "account_created_at": "2024-01-01T00:00:00Z"
        },
        "providers": [
            {
                "id": 1,
                "business_name": "Demo Provider",
                "address": "123 Main St, City, State",
                "phone": "+1987654321",
                "contact_email": "provider@example.com"
            }
        ]
    }

@router.post("/test-email")
def test_email_service(
    test_email: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Test email service configuration"""
    try:
        from app.services.email_service import email_service
        
        # Send test email
        success = email_service.send_email(
            to_email=test_email,
            subject="WaitLessQ Email Service Test",
            html_content=f"""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <title>Email Test</title>
                <style>
                    body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                    .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                    .header {{ text-align: center; background: #6366f1; color: white; padding: 20px; border-radius: 8px; }}
                    .content {{ padding: 20px; background: #f9fafb; border-radius: 8px; margin: 20px 0; }}
                    .success {{ color: #10b981; font-weight: bold; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>WaitLessQ Email Test</h1>
                        <p>Email Service Configuration Test</p>
                    </div>
                    <div class="content">
                        <p class="success">✅ Email service is working correctly!</p>
                        <p>This test email was sent from your WaitLessQ dashboard.</p>
                        <p><strong>Sent by:</strong> {current_user.email}</p>
                        <p><strong>Organization:</strong> {current_user.organization.name if current_user.organization else 'N/A'}</p>
                        <p>If you received this email, your email configuration is working properly.</p>
                    </div>
                </div>
            </body>
            </html>
            """,
            text_content=f"""
            WaitLessQ Email Service Test
            
            ✅ Email service is working correctly!
            
            This test email was sent from your WaitLessQ dashboard.
            
            Sent by: {current_user.email}
            Organization: {current_user.organization.name if current_user.organization else 'N/A'}
            
            If you received this email, your email configuration is working properly.
            """
        )
        
        if success:
            return {
                "success": True,
                "message": "Test email sent successfully",
                "recipient": test_email
            }
        else:
            return {
                "success": False,
                "message": "Failed to send test email",
                "recipient": test_email
            }
            
    except Exception as e:
        print(f"❌ Email test error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Email test failed: {str(e)}")
