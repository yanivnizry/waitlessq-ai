# WaitLessQ Production Deployment Guide

This guide provides step-by-step instructions for deploying WaitLessQ in a production environment with enterprise-grade security, monitoring, and scalability.

## 🚀 Quick Start

```bash
# 1. Clone and setup
git clone <repository-url>
cd waitlessq

# 2. Generate SSL certificates
chmod +x scripts/generate-ssl-certs.sh
./scripts/generate-ssl-certs.sh

# 3. Configure environment
cp .env.example .env
cp frontend/.env.example frontend/.env
# Edit .env files with production values

# 4. Deploy
docker-compose -f docker-compose.prod.yml up -d
```

## 📋 Pre-Deployment Checklist

### Infrastructure Requirements

- [ ] **Server Specifications**
  - Minimum: 4 CPU cores, 8GB RAM, 100GB SSD
  - Recommended: 8 CPU cores, 16GB RAM, 200GB SSD
  - Network: 1Gbps connection

- [ ] **Operating System**
  - Ubuntu 20.04+ LTS or RHEL 8+
  - Docker 20.10+ and Docker Compose 2.0+
  - Firewall configured (UFW/iptables)

- [ ] **Domain & DNS**
  - Domain name registered
  - DNS A records configured:
    - `api.yourdomain.com` → Server IP
    - `dashboard.yourdomain.com` → Server IP
    - `pwa.yourdomain.com` → Server IP

### Security Requirements

- [ ] **SSL/TLS Certificates**
  - Production certificates from trusted CA (Let's Encrypt recommended)
  - Certificate auto-renewal configured
  - Strong cipher suites enabled

- [ ] **Secrets Management**
  - All default passwords changed
  - Strong, unique secrets generated
  - Environment variables properly configured
  - No secrets in version control

- [ ] **Network Security**
  - Firewall rules configured (ports 80, 443 only)
  - SSH key-based authentication
  - Fail2ban or similar intrusion prevention
  - VPN access for administrative tasks

## 🔧 Detailed Setup Instructions

### 1. Server Preparation

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Configure firewall
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw --force enable
```

### 2. SSL Certificate Setup

#### Option A: Let's Encrypt (Recommended)

```bash
# Install Certbot
sudo apt install certbot

# Generate certificates
sudo certbot certonly --standalone \
  -d yourdomain.com \
  -d api.yourdomain.com \
  -d dashboard.yourdomain.com \
  -d pwa.yourdomain.com

# Copy certificates to nginx directory
sudo mkdir -p nginx/ssl
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem nginx/ssl/key.pem
sudo cp /etc/letsencrypt/live/yourdomain.com/chain.pem nginx/ssl/chain.pem

# Generate DH parameters
sudo openssl dhparam -out nginx/ssl/dhparam.pem 2048

# Setup auto-renewal
echo "0 12 * * * /usr/bin/certbot renew --quiet && docker-compose -f /path/to/docker-compose.prod.yml restart nginx" | sudo crontab -
```

#### Option B: Self-Signed (Development Only)

```bash
chmod +x scripts/generate-ssl-certs.sh
./scripts/generate-ssl-certs.sh
```

### 3. Environment Configuration

#### Backend Environment (.env)

```bash
# Copy template and edit
cp .env.example .env
```

**Critical Settings:**
```env
ENVIRONMENT=production
DEBUG=false

# Generate secure secrets (32+ characters)
SECRET_KEY=your-super-secure-secret-key-here
JWT_SECRET=your-jwt-secret-key-here

# Database (use strong password)
DATABASE_URL=postgresql://waitlessq_user:STRONG_PASSWORD_HERE@postgres:5432/waitlessq

# Redis (enable authentication)
REDIS_URL=redis://:REDIS_PASSWORD_HERE@redis:6379
REDIS_PASSWORD=STRONG_REDIS_PASSWORD_HERE

# CORS (restrict to your domains)
CORS_ORIGINS=https://dashboard.yourdomain.com,https://pwa.yourdomain.com

# PostgreSQL (for docker-compose)
POSTGRES_DB=waitlessq
POSTGRES_USER=waitlessq_user
POSTGRES_PASSWORD=STRONG_PASSWORD_HERE
```

#### Frontend Environment (frontend/.env)

```bash
# Copy template and edit
cp frontend/.env.example frontend/.env
```

```env
REACT_APP_API_URL=https://api.yourdomain.com
REACT_APP_WS_URL=wss://api.yourdomain.com
REACT_APP_ENVIRONMENT=production
REACT_APP_ENABLE_DEVTOOLS=false
REACT_APP_ENABLE_SW=true
```

### 4. Directory Structure Setup

```bash
# Create data directories
sudo mkdir -p /var/lib/waitlessq/{postgres,redis,backups,uploads,pwa}
sudo chown -R 1000:1000 /var/lib/waitlessq

# Create monitoring auth file
sudo htpasswd -c nginx/.htpasswd admin
```

### 5. Deployment

```bash
# Build and start services
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d

# Verify deployment
docker-compose -f docker-compose.prod.yml ps
docker-compose -f docker-compose.prod.yml logs
```

## 🔍 Post-Deployment Verification

### Health Checks

```bash
# API health
curl -k https://api.yourdomain.com/health

# Frontend accessibility
curl -k https://dashboard.yourdomain.com

# SSL certificate validation
openssl s_client -connect api.yourdomain.com:443 -servername api.yourdomain.com
```

### Security Verification

```bash
# SSL Labs test (external)
# Visit: https://www.ssllabs.com/ssltest/

# Security headers check
curl -I https://api.yourdomain.com

# Port scan (should only show 80, 443)
nmap -p 1-65535 yourdomain.com
```

## 📊 Monitoring & Maintenance

### Log Management

```bash
# View application logs
docker-compose -f docker-compose.prod.yml logs -f backend-1
docker-compose -f docker-compose.prod.yml logs -f nginx

# Log rotation (add to crontab)
echo "0 2 * * * docker system prune -f" | crontab -
```

### Backup Management

```bash
# Manual backup
docker-compose -f docker-compose.prod.yml run --rm backup

# Automated backups (add to crontab)
echo "0 3 * * * cd /path/to/waitlessq && docker-compose -f docker-compose.prod.yml run --rm backup" | crontab -
```

### Monitoring Endpoints

- **Prometheus Metrics**: `https://monitoring.internal.yourdomain.com/metrics`
- **Health Check**: `https://api.yourdomain.com/health`
- **Detailed Health**: `https://monitoring.internal.yourdomain.com/health/detailed`

## 🔄 Updates & Maintenance

### Application Updates

```bash
# 1. Backup current state
docker-compose -f docker-compose.prod.yml run --rm backup

# 2. Pull latest changes
git pull origin main

# 3. Rebuild and deploy
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d

# 4. Verify deployment
docker-compose -f docker-compose.prod.yml ps
```

### Database Migrations

```bash
# Run migrations (if applicable)
docker-compose -f docker-compose.prod.yml exec backend-1 alembic upgrade head
```

## 🚨 Troubleshooting

### Common Issues

#### SSL Certificate Issues
```bash
# Check certificate expiry
openssl x509 -in nginx/ssl/cert.pem -text -noout | grep "Not After"

# Renew Let's Encrypt certificates
sudo certbot renew
docker-compose -f docker-compose.prod.yml restart nginx
```

#### Database Connection Issues
```bash
# Check database status
docker-compose -f docker-compose.prod.yml exec postgres pg_isready

# View database logs
docker-compose -f docker-compose.prod.yml logs postgres
```

#### High Memory Usage
```bash
# Check container resource usage
docker stats

# Scale backend services
docker-compose -f docker-compose.prod.yml up -d --scale backend-1=2 --scale backend-2=2
```

## 🔐 Security Best Practices

### Regular Security Tasks

- [ ] **Weekly**
  - Review access logs for suspicious activity
  - Check SSL certificate expiry dates
  - Verify backup integrity

- [ ] **Monthly**
  - Update system packages
  - Rotate database passwords
  - Review and update firewall rules
  - Security scan with tools like Nessus or OpenVAS

- [ ] **Quarterly**
  - Penetration testing
  - Security audit of configurations
  - Update Docker images to latest versions
  - Review and update SSL/TLS configurations

### Security Monitoring

```bash
# Monitor failed login attempts
docker-compose -f docker-compose.prod.yml logs nginx | grep "401\|403"

# Check for unusual API usage
docker-compose -f docker-compose.prod.yml logs backend-1 | grep "ERROR\|WARNING"

# Monitor resource usage
docker-compose -f docker-compose.prod.yml exec prometheus curl localhost:9090/metrics
```

## 📈 Scaling Considerations

### Horizontal Scaling

```bash
# Scale backend services
docker-compose -f docker-compose.prod.yml up -d --scale backend-1=3 --scale backend-2=3 --scale backend-3=3

# Add read replicas (modify docker-compose.prod.yml)
# Configure READ_DATABASE_URL in environment
```

### Performance Optimization

- Enable Redis caching
- Configure CDN for static assets
- Implement database connection pooling
- Use database read replicas
- Enable HTTP/2 and compression

## 📞 Support & Maintenance

### Emergency Contacts

- **System Administrator**: [Contact Info]
- **Database Administrator**: [Contact Info]
- **Security Team**: [Contact Info]

### Maintenance Windows

- **Regular Maintenance**: Sundays 2:00-4:00 AM UTC
- **Emergency Maintenance**: As needed with 2-hour notice

### Backup & Recovery

- **Backup Frequency**: Daily at 3:00 AM UTC
- **Retention Period**: 30 days
- **Recovery Time Objective (RTO)**: 4 hours
- **Recovery Point Objective (RPO)**: 24 hours

---

## 📚 Additional Resources

- [Docker Security Best Practices](https://docs.docker.com/engine/security/)
- [Nginx Security Guide](https://nginx.org/en/docs/http/securing_nginx.html)
- [PostgreSQL Security](https://www.postgresql.org/docs/current/security.html)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)

**Last Updated**: $(date)
**Version**: 1.0.0