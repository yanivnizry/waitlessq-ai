# WaitLessQ Multi-Tenant Architecture

## Overview

WaitLessQ is designed as a multi-tenant application where each organization (tenant) has its own isolated environment with custom branding, domains, and configuration.

## Architecture Components

### 1. Organization Model
- **Central tenant entity** that owns all data and users
- **Domain/subdomain routing** for tenant isolation
- **Feature flags** for plan-based access control
- **Custom branding** and configuration per tenant

### 2. Tenant Isolation
- **Host-based routing** using subdomains or custom domains
- **Database-level isolation** with organization_id foreign keys
- **Role-based access control** within each tenant
- **Feature-based access control** based on plan type

### 3. Data Model Relationships

```
Organization (1) ←→ (N) User
Organization (1) ←→ (N) Provider
Provider (1) ←→ (N) Queue
Provider (1) ←→ (N) Appointment
Queue (1) ←→ (N) QueueEntry
```

## Tenant Routing

### Subdomain Routing
- `acme.waitlessq.com` → Organization with subdomain "acme"
- `clinic.waitlessq.com` → Organization with subdomain "clinic"

### Custom Domain Routing
- `appointments.acme.com` → Organization with custom_domain "appointments.acme.com"
- `booking.clinic.com` → Organization with custom_domain "booking.clinic.com"

### API Endpoints
- All endpoints are tenant-scoped automatically
- `/api/v1/providers/` → Only providers for current tenant
- `/api/v1/queues/` → Only queues for current tenant

## Role-Based Access Control

### User Roles
1. **OWNER** - Full access to organization settings
2. **ADMIN** - Manage users and providers
3. **MANAGER** - Manage queues and appointments
4. **STAFF** - Basic queue and appointment operations
5. **VIEWER** - Read-only access

### Feature Access Control
```python
@require_organization_feature("analytics")
async def get_analytics():
    # Only accessible if organization has analytics feature
    pass
```

## Organization Plans

### Basic Plan
- Up to 5 providers
- Up to 20 users
- Basic features (appointments, queues, PWA)
- 10GB storage

### Pro Plan
- Up to 25 providers
- Up to 100 users
- Advanced features (analytics, integrations)
- 50GB storage

### Enterprise Plan
- Unlimited providers and users
- All features including API access
- Custom branding
- 500GB storage

## Implementation Examples

### Creating a New Organization
```python
# POST /api/v1/organizations/
{
    "name": "Acme Medical Clinic",
    "slug": "acme-medical",
    "subdomain": "acme",
    "plan_type": "pro",
    "features": {
        "appointments": True,
        "queues": True,
        "analytics": True
    }
}
```

### Tenant-Scoped API Calls
```python
# All data automatically scoped to current tenant
@router.get("/providers/")
async def get_providers(
    tenant: TenantContext = Depends(get_current_tenant),
    db: Session = Depends(get_db)
):
    return db.query(Provider).filter(
        Provider.organization_id == tenant.organization.id
    ).all()
```

### Role-Based Endpoints
```python
@router.post("/providers/")
async def create_provider(
    current_user: User = Depends(require_role("admin"))
):
    # Only admins can create providers
    pass
```

## Security Considerations

### Data Isolation
- All queries include `organization_id` filter
- No cross-tenant data access possible
- Tenant context validated on every request

### Authentication
- JWT tokens include organization context
- User must belong to the tenant they're accessing
- Session scoped to specific tenant

### Domain Validation
- Subdomain uniqueness enforced
- Custom domain validation
- SSL certificate management per domain

## Scaling Considerations

### Database
- Organization-based partitioning possible
- Read replicas per tenant region
- Connection pooling per tenant

### Caching
- Tenant-scoped cache keys
- Redis database per tenant
- Cache invalidation per tenant

### Infrastructure
- Auto-scaling per tenant usage
- Resource limits per plan
- Monitoring per tenant

## Migration Strategy

### Existing Data Migration
1. Create default organization for existing providers
2. Update all models to include organization_id
3. Migrate existing data to new schema
4. Update API endpoints to use tenant context

### Backward Compatibility
- Maintain existing API endpoints during transition
- Gradual rollout of multi-tenant features
- Feature flags for new functionality

## Monitoring and Analytics

### Tenant Metrics
- Usage per organization
- Performance per tenant
- Resource consumption tracking
- Billing and usage analytics

### Health Checks
- Per-tenant health monitoring
- Alerting on tenant-specific issues
- SLA monitoring per plan type

## Best Practices

### Development
1. Always use tenant context in queries
2. Implement proper role checking
3. Use feature flags for plan-based access
4. Test with multiple tenant scenarios

### Deployment
1. Database migrations for new tenant fields
2. Environment-specific tenant configuration
3. Monitoring for tenant-specific issues
4. Backup strategies per tenant

### Security
1. Validate tenant access on every request
2. Implement proper CORS for custom domains
3. Use tenant-scoped API keys
4. Regular security audits per tenant 