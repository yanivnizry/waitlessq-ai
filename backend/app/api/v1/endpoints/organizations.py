from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.core.tenant import get_current_tenant, require_role, TenantContext
from app.models.organization import Organization
from app.models.user import User
from app.schemas.organization import (
    OrganizationCreate,
    OrganizationUpdate,
    OrganizationResponse,
    OrganizationList
)

router = APIRouter()

@router.post("/", response_model=OrganizationResponse)
async def create_organization(
    organization: OrganizationCreate,
    db: Session = Depends(get_db)
):
    """Create a new organization"""
    # Check if slug is unique
    existing = db.query(Organization).filter(
        Organization.slug == organization.slug
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=400,
            detail="Organization slug already exists"
        )
    
    # Check if subdomain is unique
    if organization.subdomain:
        existing = db.query(Organization).filter(
            Organization.subdomain == organization.subdomain
        ).first()
        
        if existing:
            raise HTTPException(
                status_code=400,
                detail="Subdomain already exists"
            )
    
    # Check if custom domain is unique
    if organization.custom_domain:
        existing = db.query(Organization).filter(
            Organization.custom_domain == organization.custom_domain
        ).first()
        
        if existing:
            raise HTTPException(
                status_code=400,
                detail="Custom domain already exists"
            )
    
    db_organization = Organization(**organization.dict())
    db.add(db_organization)
    db.commit()
    db.refresh(db_organization)
    
    return db_organization

@router.get("/", response_model=OrganizationList)
async def list_organizations(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db)
):
    """List all organizations (admin only)"""
    organizations = db.query(Organization).offset(skip).limit(limit).all()
    total = db.query(Organization).count()
    
    return OrganizationList(
        organizations=organizations,
        total=total,
        page=skip // limit + 1,
        per_page=limit
    )

@router.get("/current", response_model=OrganizationResponse)
async def get_current_organization(
    tenant: TenantContext = Depends(get_current_tenant)
):
    """Get current organization details"""
    return tenant.organization

@router.put("/current", response_model=OrganizationResponse)
async def update_current_organization(
    organization_update: OrganizationUpdate,
    tenant: TenantContext = Depends(get_current_tenant),
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db)
):
    """Update current organization"""
    org = tenant.organization
    
    # Check for conflicts if updating subdomain or custom domain
    if organization_update.subdomain and organization_update.subdomain != org.subdomain:
        existing = db.query(Organization).filter(
            Organization.subdomain == organization_update.subdomain,
            Organization.id != org.id
        ).first()
        
        if existing:
            raise HTTPException(
                status_code=400,
                detail="Subdomain already exists"
            )
    
    if organization_update.custom_domain and organization_update.custom_domain != org.custom_domain:
        existing = db.query(Organization).filter(
            Organization.custom_domain == organization_update.custom_domain,
            Organization.id != org.id
        ).first()
        
        if existing:
            raise HTTPException(
                status_code=400,
                detail="Custom domain already exists"
            )
    
    # Update fields
    update_data = organization_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(org, field, value)
    
    db.commit()
    db.refresh(org)
    
    return org

@router.get("/{organization_id}", response_model=OrganizationResponse)
async def get_organization(
    organization_id: int,
    db: Session = Depends(get_db)
):
    """Get organization by ID (admin only)"""
    organization = db.query(Organization).filter(
        Organization.id == organization_id
    ).first()
    
    if not organization:
        raise HTTPException(
            status_code=404,
            detail="Organization not found"
        )
    
    return organization

@router.put("/{organization_id}", response_model=OrganizationResponse)
async def update_organization(
    organization_id: int,
    organization_update: OrganizationUpdate,
    db: Session = Depends(get_db)
):
    """Update organization by ID (admin only)"""
    organization = db.query(Organization).filter(
        Organization.id == organization_id
    ).first()
    
    if not organization:
        raise HTTPException(
            status_code=404,
            detail="Organization not found"
        )
    
    # Check for conflicts
    if organization_update.subdomain and organization_update.subdomain != organization.subdomain:
        existing = db.query(Organization).filter(
            Organization.subdomain == organization_update.subdomain,
            Organization.id != organization_id
        ).first()
        
        if existing:
            raise HTTPException(
                status_code=400,
                detail="Subdomain already exists"
            )
    
    if organization_update.custom_domain and organization_update.custom_domain != organization.custom_domain:
        existing = db.query(Organization).filter(
            Organization.custom_domain == organization_update.custom_domain,
            Organization.id != organization_id
        ).first()
        
        if existing:
            raise HTTPException(
                status_code=400,
                detail="Custom domain already exists"
            )
    
    # Update fields
    update_data = organization_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(organization, field, value)
    
    db.commit()
    db.refresh(organization)
    
    return organization

@router.delete("/{organization_id}")
async def delete_organization(
    organization_id: int,
    db: Session = Depends(get_db)
):
    """Delete organization (admin only)"""
    organization = db.query(Organization).filter(
        Organization.id == organization_id
    ).first()
    
    if not organization:
        raise HTTPException(
            status_code=404,
            detail="Organization not found"
        )
    
    # Soft delete - just mark as inactive
    organization.is_active = False
    db.commit()
    
    return {"message": "Organization deleted successfully"} 