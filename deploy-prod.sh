#!/bin/bash

# Production Deployment Script for WaitLessQ
# This script handles secure deployment to production environment

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   error "This script should not be run as root"
fi

# Check if Docker is installed and running
if ! command -v docker &> /dev/null; then
    error "Docker is not installed"
fi

if ! docker info &> /dev/null; then
    error "Docker is not running"
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    error "Docker Compose is not installed"
fi

log "Starting production deployment..."

# Check if .env file exists
if [[ ! -f .env ]]; then
    error ".env file not found. Please create it from env.example"
fi

# Load environment variables
source .env

# Validate required environment variables
required_vars=(
    "POSTGRES_DB"
    "POSTGRES_USER"
    "POSTGRES_PASSWORD"
    "SECRET_KEY"
    "JWT_SECRET"
    "CORS_ORIGINS"
    "REDIS_PASSWORD"
)

for var in "${required_vars[@]}"; do
    if [[ -z "${!var:-}" ]]; then
        error "Required environment variable $var is not set"
    fi
done

# Validate secrets are not default values
if [[ "$SECRET_KEY" == "your-super-secret-key-change-in-production" ]]; then
    error "SECRET_KEY must be changed from default value"
fi

if [[ "$JWT_SECRET" == "your-jwt-secret-key-change-in-production" ]]; then
    error "JWT_SECRET must be changed from default value"
fi

# Validate CORS origins for production
if [[ "$CORS_ORIGINS" == *"localhost"* ]]; then
    warn "CORS_ORIGINS contains localhost - this should be removed in production"
fi

log "Environment validation passed"

# Create necessary directories
log "Creating necessary directories..."
mkdir -p logs/nginx
mkdir -p logs/backend
mkdir -p logs/frontend
mkdir -p backups
mkdir -p monitoring
mkdir -p nginx/ssl

# Generate SSL certificates if they don't exist
if [[ ! -f nginx/ssl/cert.pem ]] || [[ ! -f nginx/ssl/key.pem ]]; then
    log "Generating self-signed SSL certificates..."
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout nginx/ssl/key.pem \
        -out nginx/ssl/cert.pem \
        -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"
fi

# Set proper permissions
log "Setting proper permissions..."
chmod 600 nginx/ssl/key.pem
chmod 644 nginx/ssl/cert.pem

# Stop existing containers
log "Stopping existing containers..."
docker-compose -f docker-compose.prod.yml down --remove-orphans

# Build and start services
log "Building and starting services..."
docker-compose -f docker-compose.prod.yml build --no-cache

# Start services
log "Starting services..."
docker-compose -f docker-compose.prod.yml up -d

# Wait for services to be healthy
log "Waiting for services to be healthy..."
sleep 30

# Check service health
log "Checking service health..."

# Check PostgreSQL
if ! docker-compose -f docker-compose.prod.yml exec -T postgres pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"; then
    error "PostgreSQL is not healthy"
fi

# Check Redis
if ! docker-compose -f docker-compose.prod.yml exec -T redis redis-cli -a "$REDIS_PASSWORD" ping; then
    error "Redis is not healthy"
fi

# Check Backend
if ! curl -f http://localhost:8000/health; then
    error "Backend is not healthy"
fi

# Check Frontend
if ! curl -f http://localhost:3000; then
    error "Frontend is not healthy"
fi

log "All services are healthy!"

# Run database migrations
log "Running database migrations..."
docker-compose -f docker-compose.prod.yml exec -T backend alembic upgrade head

# Create initial admin user if needed
log "Checking for admin user..."
if ! docker-compose -f docker-compose.prod.yml exec -T backend python -c "
from app.core.database import get_db
from app.models.user import User
from sqlalchemy.orm import Session

db = next(get_db())
admin = db.query(User).filter(User.email == 'admin@waitlessq.com').first()
if not admin:
    print('No admin user found')
    exit(1)
else:
    print('Admin user exists')
    exit(0)
"; then
    log "Creating initial admin user..."
    docker-compose -f docker-compose.prod.yml exec -T backend python -c "
from app.core.database import get_db
from app.models.user import User
from passlib.context import CryptContext
from sqlalchemy.orm import Session

pwd_context = CryptContext(schemes=['bcrypt'], deprecated='auto')

db = next(get_db())
admin = User(
    email='admin@waitlessq.com',
    full_name='System Administrator',
    hashed_password=pwd_context.hash('Admin123!'),
    is_active=True
)
db.add(admin)
db.commit()
print('Admin user created: admin@waitlessq.com / Admin123!')
"
fi

# Set up monitoring
log "Setting up monitoring..."
if [[ ! -f monitoring/prometheus.yml ]]; then
    cat > monitoring/prometheus.yml << EOF
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'waitlessq-backend'
    static_configs:
      - targets: ['backend:8000']
    metrics_path: '/metrics'

  - job_name: 'waitlessq-nginx'
    static_configs:
      - targets: ['nginx:80']
    metrics_path: '/nginx_status'
EOF
fi

# Set up log aggregation
if [[ ! -f monitoring/fluent-bit.conf ]]; then
    cat > monitoring/fluent-bit.conf << EOF
[SERVICE]
    Flush        1
    Log_Level    info
    Parsers_File parsers.conf

[INPUT]
    Name             tail
    Path             /logs/*.log
    Parser           nginx
    Tag              nginx.*
    Mem_Buf_Limit    5MB
    Skip_Long_Lines  On

[OUTPUT]
    Name        es
    Match       *
    Host        elasticsearch
    Port        9200
    Index       waitlessq-logs
    Type        _doc
    HTTP_User   elastic
    HTTP_Passwd changeme
EOF
fi

# Create backup script
log "Setting up backup script..."
cat > backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="waitlessq_backup_$DATE.sql"

echo "Creating database backup: $BACKUP_FILE"
docker-compose -f docker-compose.prod.yml exec -T postgres pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > "$BACKUP_DIR/$BACKUP_FILE"

# Compress backup
gzip "$BACKUP_DIR/$BACKUP_FILE"

# Keep only last 7 days of backups
find "$BACKUP_DIR" -name "waitlessq_backup_*.sql.gz" -mtime +7 -delete

echo "Backup completed: $BACKUP_FILE.gz"
EOF

chmod +x backup.sh

# Set up cron job for backups
log "Setting up automated backups..."
(crontab -l 2>/dev/null; echo "0 2 * * * $(pwd)/backup.sh") | crontab -

# Final health check
log "Performing final health check..."

# Check all services
services=("postgres" "redis" "backend" "frontend" "nginx")
for service in "${services[@]}"; do
    if ! docker-compose -f docker-compose.prod.yml ps "$service" | grep -q "Up"; then
        error "Service $service is not running"
    fi
done

log "Production deployment completed successfully!"
log "Services are running on:"
log "  - Frontend: https://localhost"
log "  - API: https://localhost/api"
log "  - Health Check: https://localhost/health"
log ""
log "Monitoring:"
log "  - Grafana: http://localhost:3001 (admin/admin)"
log "  - Prometheus: http://localhost:9090"
log ""
log "Admin credentials:"
log "  - Email: admin@waitlessq.com"
log "  - Password: Admin123!"
log ""
log "Remember to:"
log "  1. Change default admin password"
log "  2. Configure proper SSL certificates"
log "  3. Set up proper monitoring alerts"
log "  4. Configure backup retention policy"
log "  5. Set up log rotation" 