from fastapi import Request, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import Optional
import re
from app.core.database import get_db
from app.models.organization import Organization
from app.models.user import User

class TenantContext:
    """Context for current tenant/organization"""
    def __init__(self, organization: Organization):
        self.organization = organization
        self.slug = organization.slug
        self.subdomain = organization.subdomain
        self.custom_domain = organization.custom_domain

async def get_tenant_from_host(request: Request, db: Session = Depends(get_db)) -> Optional[TenantContext]:
    """Extract tenant information from request host"""
    host = request.headers.get("host", "").lower()
    
    # Check for custom domain
    if host and "." in host:
        # Try to find organization by custom domain
        organization = db.query(Organization).filter(
            Organization.custom_domain == host,
            Organization.is_active == True
        ).first()
        
        if organization:
            return TenantContext(organization)
    
    # Check for subdomain
    subdomain_pattern = r"^([^.]+)\.(.*)$"
    match = re.match(subdomain_pattern, host)
    
    if match:
        subdomain = match.group(1)
        
        # Skip common subdomains
        if subdomain in ["www", "api", "admin", "app", "dashboard"]:
            return None
            
        organization = db.query(Organization).filter(
            Organization.subdomain == subdomain,
            Organization.is_active == True
        ).first()
        
        if organization:
            return TenantContext(organization)
    
    return None

async def get_current_tenant(
    request: Request,
    db: Session = Depends(get_db)
) -> TenantContext:
    """Get current tenant context - raises 404 if not found"""
    tenant = await get_tenant_from_host(request, db)
    
    if not tenant:
        raise HTTPException(
            status_code=404,
            detail="Organization not found or inactive"
        )
    
    return tenant

async def get_current_user_in_tenant(
    request: Request,
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(get_current_tenant)
) -> User:
    """Get current user within tenant context"""
    # This would typically get the user from JWT token
    # For now, we'll return None - implement based on your auth system
    user_id = request.headers.get("X-User-ID")
    
    if not user_id:
        raise HTTPException(
            status_code=401,
            detail="Authentication required"
        )
    
    user = db.query(User).filter(
        User.id == user_id,
        User.organization_id == tenant.organization.id,
        User.is_active == True
    ).first()
    
    if not user:
        raise HTTPException(
            status_code=403,
            detail="User not found in organization"
        )
    
    return user

def require_role(required_role: str):
    """Decorator to require specific role"""
    def role_checker(user: User = Depends(get_current_user_in_tenant)):
        if user.role.value not in ["owner", "admin"] and user.role.value != required_role:
            raise HTTPException(
                status_code=403,
                detail=f"Role '{required_role}' required"
            )
        return user
    return role_checker

def require_organization_feature(feature: str):
    """Decorator to require organization feature"""
    def feature_checker(tenant: TenantContext = Depends(get_current_tenant)):
        if not tenant.organization.features.get(feature, False):
            raise HTTPException(
                status_code=403,
                detail=f"Feature '{feature}' not available for this organization"
            )
        return tenant
    return feature_checker 