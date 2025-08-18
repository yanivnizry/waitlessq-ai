"""
Client Authentication Service for PWA users.
"""

from datetime import datetime, timedelta
from typing import Optional
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.core.config import settings
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
    
    def create_access_token(self, client_id: int, email: str) -> str:
        """Create access token for client"""
        import jwt  # Lazy import to avoid module loading issues
        
        expire = datetime.utcnow() + timedelta(minutes=self.access_token_expire_minutes)
        to_encode = {
            "sub": str(client_id),
            "email": email,
            "type": "client",
            "exp": expire
        }
        return jwt.encode(to_encode, self.secret_key, algorithm=self.algorithm)
    
    def decode_access_token(self, token: str) -> Optional[dict]:
        """Decode and validate access token"""
        import jwt  # Lazy import to avoid module loading issues
        
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
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
    
    def authenticate_client(self, email: str, password: str, db: Session) -> Optional[Client]:
        """Authenticate client with email and password"""
        # First, find the client by email
        client = db.query(Client).filter(
            Client.email == email,
            Client.is_active == True,
            Client.has_account == True
        ).first()
        
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
