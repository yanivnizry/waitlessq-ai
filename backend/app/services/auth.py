from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
import logging

from app.core.config import settings
from app.core.database import get_db
from app.models.user import User

logger = logging.getLogger(__name__)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/v1/auth/login")

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET, algorithm="HS256")
    return encoded_jwt

def verify_token(token: str):
    try:
        logger.info(f"🔐 Verifying token: {token[:50]}...")
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=["HS256"])
        email: str = payload.get("sub")
        logger.info(f"🔐 Token payload: {payload}")
        if email is None:
            logger.error("🔐 No email found in token payload")
            return None
        logger.info(f"🔐 Token verified for email: {email}")
        return email
    except JWTError as e:
        logger.error(f"🔐 JWT verification failed: {e}")
        return None

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    logger.info(f"🔐 get_current_user called with token: {token[:50] if token else 'None'}...")
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    email = verify_token(token)
    if email is None:
        logger.error("🔐 Token verification failed")
        raise credentials_exception
    
    logger.info(f"🔐 Looking up user with email: {email}")
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        logger.error(f"🔐 User not found for email: {email}")
        raise credentials_exception
    
    logger.info(f"🔐 User found: {user.email}")
    return user

async def get_current_active_user(current_user: User = Depends(get_current_user)):
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user 