from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
import re
from typing import Optional

from app.core.database import get_db
from app.core.config import settings
from app.models.user import User, UserRole
from app.models.organization import Organization
from app.models.provider import Provider
from app.schemas.auth import UserCreate, UserResponse, Token, TokenData, RegistrationResponse, ProviderRegistrationResponse
from app.services.auth import create_access_token, get_current_user

router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

def validate_password_strength(password: str) -> tuple[bool, str]:
    """
    Validate password strength
    Returns: (is_valid, error_message)
    """
    if len(password) < 8:
        return False, "Password must be at least 8 characters long"
    
    if not re.search(r"[A-Z]", password):
        return False, "Password must contain at least one uppercase letter"
    
    if not re.search(r"[a-z]", password):
        return False, "Password must contain at least one lowercase letter"
    
    if not re.search(r"\d", password):
        return False, "Password must contain at least one number"
    
    if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", password):
        return False, "Password must contain at least one special character"
    
    return True, ""

@router.post("/register", response_model=RegistrationResponse)
async def register(user_data: UserCreate, db: Session = Depends(get_db)):
    try:
        # Validate password strength
        is_valid, error_message = validate_password_strength(user_data.password)
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error_message
            )
        
        # Check if user already exists
        existing_user = db.query(User).filter(User.email == user_data.email).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User with this email already exists"
            )
        
        # Create default organization for the user
        org_slug = f"org-{user_data.email.split('@')[0]}-{int(datetime.now().timestamp())}"
        db_organization = Organization(
            name=f"{user_data.full_name}'s Organization",
            slug=org_slug,
            description="Default organization created during registration",
            contact_email=user_data.email,
            is_active=True,
            plan_type="basic"
        )
        
        db.add(db_organization)
        db.commit()
        db.refresh(db_organization)
        
        # Create new user with organization
        hashed_password = pwd_context.hash(user_data.password)
        db_user = User(
            organization_id=db_organization.id,
            email=user_data.email,
            hashed_password=hashed_password,
            full_name=user_data.full_name,
            phone=user_data.phone,
            role=UserRole.OWNER  # First user becomes owner
        )
        
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        
        return RegistrationResponse(
            message="User and organization created successfully",
            user_id=db_user.id,
            organization_id=db_organization.id
        )
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create user and organization"
        )

@router.post("/register-provider", response_model=ProviderRegistrationResponse)
async def register_provider(user_info: dict, db: Session = Depends(get_db)):
    """Register a new provider with their own organization"""
    
    try:
        # Extract user and provider info from the request
        user_data = user_info.get("user", {})
        business_info = user_info.get("business", {})
        
        # Validate password strength - password is in user_data
        is_valid, error_message = validate_password_strength(user_data["password"])
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error_message
            )
        
        # Check if user already exists
        existing_user = db.query(User).filter(User.email == user_data["email"]).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User with this email already exists"
            )
        
        # Create organization for the provider
        org_slug = f"{business_info['business_name'].lower().replace(' ', '-')}-{int(datetime.now().timestamp())}"
        db_organization = Organization(
            name=business_info["business_name"],
            slug=org_slug,
            description=business_info.get("business_description", ""),
            contact_email=user_data["email"],
            contact_phone=business_info.get("phone"),
            address=business_info.get("address"),
            city=business_info.get("city"),
            state=business_info.get("state"),
            zip_code=business_info.get("zip_code"),
            country=business_info.get("country"),
            is_active=True,
            plan_type="basic"
        )
        
        db.add(db_organization)
        db.commit()
        db.refresh(db_organization)
        
        # Create user account for the provider
        hashed_password = pwd_context.hash(user_data["password"])
        db_user = User(
            organization_id=db_organization.id,
            email=user_data["email"],
            hashed_password=hashed_password,
            full_name=user_data["full_name"],
            phone=user_data.get("phone"),
            role=UserRole.OWNER  # Provider becomes owner of their organization
        )
        
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        
        # Create the provider record
        db_provider = Provider(
            organization_id=db_organization.id,
            user_id=db_user.id,
            business_name=business_info["business_name"],
            business_description=business_info.get("business_description"),
            business_type=business_info.get("business_type", "clinic"),
            phone=business_info.get("phone"),
            website=business_info.get("website"),
            address=business_info.get("address"),
            city=business_info.get("city"),
            state=business_info.get("state"),
            zip_code=business_info.get("zip_code"),
            country=business_info.get("country"),
            is_active=True,
            accepts_walk_ins=business_info.get("accepts_walk_ins", True),
            max_queue_size=business_info.get("max_queue_size", 50),
            appointment_duration=business_info.get("appointment_duration", 30),
            buffer_time=business_info.get("buffer_time", 15),
            logo_url=business_info.get("logo_url"),
            primary_color=business_info.get("primary_color", "#3B82F6"),
            secondary_color=business_info.get("secondary_color", "#1F2937"),
            settings=business_info.get("settings", {
                "notifications": {
                    "email": True,
                    "sms": False,
                    "push": True
                },
                "appointments": {
                    "allow_overbooking": False,
                    "require_confirmation": True,
                    "auto_confirm": False
                },
                "queues": {
                    "auto_call_next": True,
                    "estimated_wait_time": True,
                    "max_wait_time": 120
                }
            })
        )
        
        db.add(db_provider)
        db.commit()
        db.refresh(db_provider)
        
        return ProviderRegistrationResponse(
            message="Provider registered successfully",
            user_id=db_user.id,
            organization_id=db_organization.id,
            provider_id=db_provider.id,
            business_name=db_provider.business_name
        )
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to register provider: {str(e)}"
        )

@router.post("/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    # Validate input
    if not form_data.username or not form_data.password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email and password are required"
        )
    
    # Find user
    user = db.query(User).filter(User.email == form_data.username).first()
    
    # Verify password
    if not user or not pwd_context.verify(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    # Check if user is active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
    
    # Create access token
    access_token = create_access_token(data={"sub": user.email})
    
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    return current_user

@router.post("/refresh", response_model=Token)
async def refresh_token(current_user: User = Depends(get_current_user)):
    # Create new access token
    access_token = create_access_token(data={"sub": current_user.email})
    
    return {"access_token": access_token, "token_type": "bearer"} 