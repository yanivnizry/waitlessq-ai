"""
Client Invitation Service for managing client invitations and account creation.
"""

from datetime import datetime, timedelta
from typing import Optional, Tuple
from sqlalchemy.orm import Session

from app.models.client import Client
from app.models.provider import Provider
from app.models.organization import Organization
from app.services.email_service import email_service
# Import client_auth_service when needed to avoid circular imports
from app.core.config import settings


class ClientInvitationService:
    """Service for managing client invitations"""
    
    def __init__(self):
        # Invitation expires in 7 days by default
        self.invitation_expire_days = getattr(settings, 'CLIENT_INVITATION_EXPIRE_DAYS', 7)
        # Base URLs from centralized configuration
        self.pwa_base_url = settings.PWA_BASE_URL
        self.backend_base_url = settings.BACKEND_BASE_URL
    
    def send_client_invitation(
        self, 
        client_id: int, 
        db: Session, 
        provider_id: Optional[int] = None
    ) -> Tuple[bool, str]:
        """
        Send invitation email to a client
        
        Args:
            client_id: ID of the client to invite
            db: Database session
            provider_id: Optional provider ID to get provider info for email
            
        Returns:
            Tuple of (success: bool, message: str)
        """
        try:
            # Get client
            client = db.query(Client).filter(Client.id == client_id).first()
            if not client:
                return False, "Client not found"
            
            if not client.email:
                return False, "Client has no email address"
            
            if client.has_account:
                return False, "Client already has an account"
            
            # Generate invitation token
            invitation_token = email_service.generate_invitation_token()
            
            # Set invitation details
            client.invitation_token = invitation_token
            client.invitation_sent_at = datetime.utcnow()
            client.invitation_expires_at = datetime.utcnow() + timedelta(days=self.invitation_expire_days)
            
            # Get provider info for the email
            provider_name = "Your Service Provider"
            provider_logo_url = None
            
            if provider_id:
                provider = db.query(Provider).filter(Provider.id == provider_id).first()
                if provider:
                    provider_name = provider.business_name
                    provider_logo_url = provider.logo_url
            else:
                # Get organization info as fallback
                organization = db.query(Organization).filter(
                    Organization.id == client.organization_id
                ).first()
                if organization:
                    provider_name = organization.name
            
            # Create invitation link using organization subdomain
            # Reuse organization query if not already fetched
            if 'organization' not in locals() or organization is None:
                organization = db.query(Organization).filter(
                    Organization.id == client.organization_id
                ).first()
            
            # Use organization subdomain, slug, or fallback to org-{id}
            if organization and organization.subdomain:
                org_subdomain = organization.subdomain
            elif organization and organization.slug:
                org_subdomain = organization.slug
            else:
                org_subdomain = f"org-{client.organization_id}"
            
            # For development: use localhost subdomain format
            if "localhost" in settings.BASE_URL:
                invitation_link = f"http://{org_subdomain}.localhost:8001/?token={invitation_token}"
            else:
                # For production: use proper subdomain format like https://clinic-name.app.waitlessq.com/?token=...
                base_domain = settings.BASE_URL.replace('http://', '').replace('https://', '')
                invitation_link = f"https://{org_subdomain}.app.{base_domain}/?token={invitation_token}"
            
            # Send email
            email_sent = email_service.send_client_invitation(
                client_name=client.name,
                client_email=client.email,
                provider_name=provider_name,
                invitation_link=invitation_link,
                provider_logo_url=provider_logo_url
            )
            
            if email_sent:
                db.commit()
                return True, f"Invitation sent successfully to {client.email}"
            else:
                # Keep invitation token even if email failed (for manual sending)
                db.commit()
                return False, "Email configuration not set up. Invitation token generated but email not sent."
                
        except Exception as e:
            db.rollback()
            return False, f"Error sending invitation: {str(e)}"
    
    def validate_invitation_token(self, token: str, db: Session) -> Optional[Client]:
        """
        Validate an invitation token and return the client if valid
        
        Args:
            token: Invitation token
            db: Database session
            
        Returns:
            Client object if token is valid, None otherwise
        """
        try:
            client = db.query(Client).filter(
                Client.invitation_token == token,
                Client.has_account == False,
                Client.is_active == True
            ).first()
            
            if not client:
                return None
            
            # Check if token has expired
            if client.invitation_expires_at and client.invitation_expires_at < datetime.utcnow():
                return None
            
            return client
            
        except Exception as e:
            print(f"Error validating invitation token: {str(e)}")
            return None
    
    def complete_client_registration(
        self, 
        token: str, 
        password: str, 
        db: Session
    ) -> Tuple[bool, str, Optional[dict]]:
        """
        Complete client registration with invitation token
        
        Args:
            token: Invitation token
            password: Client's chosen password
            db: Database session
            
        Returns:
            Tuple of (success: bool, message: str, client_data: dict)
        """
        try:
            # Validate token
            client = self.validate_invitation_token(token, db)
            if not client:
                return False, "Invalid or expired invitation token", None
            
            # Hash password
            from app.services.client_auth import client_auth_service
            hashed_password = client_auth_service.hash_password(password)
            
            # Update client record
            client.has_account = True
            client.hashed_password = hashed_password
            client.account_created_at = datetime.utcnow()
            client.invitation_token = None  # Clear the token
            client.invitation_expires_at = None
            
            # Create access token
            # client_auth_service already imported above
            access_token = client_auth_service.create_access_token(
                client_id=client.id,
                email=client.email,
                organization_id=client.organization_id
            )
            
            db.commit()
            
            client_data = {
                "client_id": client.id,
                "access_token": access_token,
                "client": {
                    "id": client.id,
                    "name": client.name,
                    "email": client.email,
                    "phone": client.phone,
                    "organization_id": client.organization_id
                }
            }
            
            return True, "Account created successfully", client_data
            
        except Exception as e:
            db.rollback()
            return False, f"Error creating account: {str(e)}", None
    
    def resend_invitation(self, client_id: int, db: Session) -> Tuple[bool, str]:
        """
        Resend invitation to a client
        
        Args:
            client_id: ID of the client
            db: Database session
            
        Returns:
            Tuple of (success: bool, message: str)
        """
        try:
            client = db.query(Client).filter(Client.id == client_id).first()
            if not client:
                return False, "Client not found"
            
            if client.has_account:
                return False, "Client already has an account"
            
            # Send new invitation (this will update the token and expiry)
            return self.send_client_invitation(client_id, db)
            
        except Exception as e:
            return False, f"Error resending invitation: {str(e)}"


# Global client invitation service instance
client_invitation_service = ClientInvitationService()
