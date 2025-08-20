"""
Client Authentication Service for PWA users.
"""

from datetime import datetime, timedelta
from typing import Optional
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.core.config import settings
from app.core.database import get_db
from app.models.client import Client
from app.models.user import User


class ClientAuthService:
    """Authentication service for client users"""
    
    def __init__(self):
        self.pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        # Use a different secret key for client tokens to separate from admin tokens
        self.secret_key = getattr(settings, 'CLIENT_JWT_SECRET_KEY', settings.SECRET_KEY + '_client')
        self.algorithm = "HS256"
        self.access_token_expire_minutes = getattr(settings, 'CLIENT_ACCESS_TOKEN_EXPIRE_MINUTES', 60 * 24 * 7)  # 7 days
    
    def hash_password(self, password: str) -> str:
        """Hash a password"""
        return self.pwd_context.hash(password)
    
    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """Verify a password against its hash"""
        return self.pwd_context.verify(plain_password, hashed_password)
    
    def create_access_token(self, client_id: int, email: str, organization_id: int) -> str:
        """Create access token for client"""
        import jwt as pyjwt  # Import PyJWT library
        
        expire = datetime.utcnow() + timedelta(minutes=self.access_token_expire_minutes)
        to_encode = {
            "sub": str(client_id),
            "email": email,
            "organization_id": organization_id,
            "type": "client",
            "exp": expire
        }
        return pyjwt.encode(to_encode, self.secret_key, algorithm=self.algorithm)
    
    def create_password_reset_token(self, client_id: int, email: str, organization_id: int) -> str:
        """Create password reset token for client"""
        import jwt as pyjwt  # Import PyJWT library
        
        # Password reset tokens expire in 1 hour
        expire = datetime.utcnow() + timedelta(hours=1)
        to_encode = {
            "sub": str(client_id),
            "email": email,
            "organization_id": organization_id,
            "type": "client_reset",
            "exp": expire
        }
        return pyjwt.encode(to_encode, self.secret_key, algorithm=self.algorithm)
    
    def decode_password_reset_token(self, token: str) -> Optional[dict]:
        """Decode and validate password reset token"""
        import jwt as pyjwt  # Import PyJWT library
        
        try:
            payload = pyjwt.decode(token, self.secret_key, algorithms=[self.algorithm])
            if payload.get("type") != "client_reset":
                return None
            return payload
        except Exception:  # Catch JWT errors without importing jwt at module level
            return None
    
    def decode_access_token(self, token: str) -> Optional[dict]:
        """Decode and validate access token"""
        import jwt as pyjwt  # Import PyJWT library
        
        try:
            payload = pyjwt.decode(token, self.secret_key, algorithms=[self.algorithm])
            if payload.get("type") != "client":
                return None
            return payload
        except Exception:  # Catch JWT errors without importing jwt at module level
            return None
    
    def get_client_from_token(self, token: str, db: Session) -> Optional[Client]:
        """Get client from access token"""
        payload = self.decode_access_token(token)
        if not payload:
            return None
        
        client_id = payload.get("sub")
        if not client_id:
            return None
        
        try:
            client_id = int(client_id)
            client = db.query(Client).filter(
                Client.id == client_id,
                Client.is_active == True,
                Client.has_account == True
            ).first()
            return client
        except (ValueError, TypeError):
            return None
    
    def authenticate_client(self, email: str, password: str, db: Session, organization_id: Optional[int] = None) -> Optional[Client]:
        """Authenticate client with email and password"""
        # First, find the client by email
        query = db.query(Client).filter(
            Client.email == email,
            Client.is_active == True,
            Client.has_account == True
        )
        
        # If organization_id is provided, filter by it (for business-specific PWAs)
        if organization_id:
            query = query.filter(Client.organization_id == organization_id)
        
        client = query.first()
        
        if not client or not client.hashed_password:
            return None
        
        if not self.verify_password(password, client.hashed_password):
            return None
        
        # Update last login
        client.last_login_at = datetime.utcnow()
        db.commit()
        
        return client


# Global client auth service instance
client_auth_service = ClientAuthService()


# FastAPI Dependencies
from fastapi import Request
client_security = HTTPBearer()

def get_organization_from_request(request: Request, db: Session) -> Optional[int]:
    """Extract organization ID from request headers or URL path"""
    # Try to get organization from URL path (e.g., /api/v1/appointments/client?org=123)
    org_id = request.query_params.get('org')
    if org_id:
        try:
            return int(org_id)
        except ValueError:
            pass
    
    # Try to get from custom header
    org_header = request.headers.get('X-Organization-ID')
    if org_header:
        try:
            return int(org_header)
        except ValueError:
            pass
    
    # For PWA requests, we might need to determine org from subdomain
    # This would be implemented based on your PWA routing strategy
    return None

async def get_current_client(
    credentials: HTTPAuthorizationCredentials = Depends(client_security),
    db: Session = Depends(get_db)
) -> Client:
    """Get current authenticated client"""
    token = credentials.credentials
    client = client_auth_service.get_client_from_token(token, db)
    
    if not client:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired client token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return client

async def get_current_client_with_org_validation(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(client_security),
    db: Session = Depends(get_db)
) -> Client:
    """Get current authenticated client and validate organization context"""
    token = credentials.credentials
    client = client_auth_service.get_client_from_token(token, db)
    
    if not client:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired client token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Get organization context from request
    requested_org_id = get_organization_from_request(request, db)
    
    # If organization context is provided, validate that client belongs to it
    if requested_org_id and client.organization_id != requested_org_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Client does not belong to this organization",
        )
    
    return client
