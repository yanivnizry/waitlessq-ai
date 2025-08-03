# WaitLessQ Security Guide

## Overview

This document provides comprehensive security guidelines for deploying and maintaining the WaitLessQ application in production environments.

## Critical Security Requirements

### 1. Environment Variables

**CRITICAL**: Never commit secrets to version control. All sensitive configuration must be managed through environment variables.

#### Required Environment Variables

```bash
# Database
POSTGRES_DB=waitlessq
POSTGRES_USER=waitlessq_user
POSTGRES_PASSWORD=<secure-password>

# Security
SECRET_KEY=<cryptographically-secure-random-string>
JWT_SECRET=<cryptographically-secure-random-string>

# CORS (Production)
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Redis
REDIS_PASSWORD=<secure-password>
```

#### Generating Secure Secrets

```bash
# Generate secure secrets
openssl rand -base64 32  # For SECRET_KEY
openssl rand -base64 32  # For JWT_SECRET
```

### 2. SSL/TLS Configuration

**REQUIRED**: All production deployments must use HTTPS.

#### SSL Certificate Setup

1. **Let's Encrypt (Recommended)**
   ```bash
   # Install certbot
   sudo apt-get install certbot
   
   # Generate certificate
   sudo certbot certonly --standalone -d yourdomain.com
   ```

2. **Self-Signed (Development Only)**
   ```bash
   openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
       -keyout nginx/ssl/key.pem \
       -out nginx/ssl/cert.pem \
       -subj "/C=US/ST=State/L=City/O=Organization/CN=yourdomain.com"
   ```

### 3. Database Security

#### PostgreSQL Hardening

1. **Use Strong Authentication**
   ```sql
   -- Create application user with limited privileges
   CREATE USER waitlessq_user WITH PASSWORD 'secure-password';
   GRANT CONNECT ON DATABASE waitlessq TO waitlessq_user;
   GRANT USAGE ON SCHEMA public TO waitlessq_user;
   GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO waitlessq_user;
   ```

2. **Enable SSL Connections**
   ```bash
   # In postgresql.conf
   ssl = on
   ssl_cert_file = '/path/to/server.crt'
   ssl_key_file = '/path/to/server.key'
   ```

3. **Regular Backups**
   ```bash
   # Automated backup script
   pg_dump -U waitlessq_user -d waitlessq | gzip > backup_$(date +%Y%m%d).sql.gz
   ```

### 4. Network Security

#### Firewall Configuration

```bash
# Allow only necessary ports
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP (redirect to HTTPS)
sudo ufw allow 443/tcp   # HTTPS
sudo ufw deny 5432/tcp   # PostgreSQL (internal only)
sudo ufw deny 6379/tcp   # Redis (internal only)
```

#### Docker Network Security

```yaml
# docker-compose.prod.yml
networks:
  frontend:
    driver: bridge
  backend:
    driver: bridge
    internal: true  # No external access
  monitoring:
    driver: bridge
    internal: true  # No external access
```

### 5. Application Security

#### Input Validation

All user inputs are validated and sanitized:

```python
# Example validation
def validate_email(email: str) -> bool:
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None

def sanitize_string(value: str) -> str:
    return re.sub(r'[<>"\']', '', value.strip())
```

#### Password Security

- Minimum 8 characters
- Must contain uppercase, lowercase, number, and special character
- Stored using bcrypt with salt
- Rate limiting on login attempts

#### Rate Limiting

```python
# API rate limits
RATE_LIMIT_PER_MINUTE = 100
RATE_LIMIT_PER_HOUR = 1000

# Login rate limits
LOGIN_RATE_LIMIT = 5  # attempts per minute
```

### 6. Monitoring and Logging

#### Security Monitoring

1. **Failed Login Attempts**
   ```bash
   # Monitor failed logins
   grep "Failed login" /var/log/nginx/access.log | wc -l
   ```

2. **Rate Limit Violations**
   ```bash
   # Monitor rate limit hits
   grep "429" /var/log/nginx/access.log
   ```

3. **Suspicious Activity**
   ```bash
   # Monitor for SQL injection attempts
   grep -i "union\|select\|insert\|delete\|update" /var/log/nginx/access.log
   ```

#### Log Retention

```bash
# Rotate logs daily, keep for 30 days
logrotate /etc/logrotate.d/waitlessq
```

### 7. Backup and Recovery

#### Database Backups

```bash
#!/bin/bash
# backup.sh
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="waitlessq_backup_$DATE.sql"

# Create backup
docker-compose -f docker-compose.prod.yml exec -T postgres \
    pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > "$BACKUP_FILE"

# Compress
gzip "$BACKUP_FILE"

# Upload to secure storage
aws s3 cp "$BACKUP_FILE.gz" s3://your-backup-bucket/

# Clean up old backups (keep 30 days)
find . -name "waitlessq_backup_*.sql.gz" -mtime +30 -delete
```

#### Recovery Procedures

```bash
# Restore from backup
gunzip backup_20231201_120000.sql.gz
docker-compose -f docker-compose.prod.yml exec -T postgres \
    psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" < backup_20231201_120000.sql
```

### 8. Incident Response

#### Security Incident Checklist

1. **Immediate Response**
   - [ ] Isolate affected systems
   - [ ] Preserve evidence
   - [ ] Notify security team
   - [ ] Document incident

2. **Investigation**
   - [ ] Review logs for intrusion points
   - [ ] Identify affected data
   - [ ] Determine attack vector
   - [ ] Assess damage scope

3. **Recovery**
   - [ ] Patch vulnerabilities
   - [ ] Restore from clean backup
   - [ ] Reset compromised credentials
   - [ ] Verify system integrity

4. **Post-Incident**
   - [ ] Update security measures
   - [ ] Review incident response
   - [ ] Update documentation
   - [ ] Conduct lessons learned

### 9. Security Headers

The application includes comprehensive security headers:

```nginx
# Security headers in nginx.conf
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Strict-Transport-Security "max-age=63072000" always;
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' ws: wss:;" always;
```

### 10. Regular Security Audits

#### Monthly Security Checklist

- [ ] Review access logs for suspicious activity
- [ ] Update all dependencies
- [ ] Rotate secrets and certificates
- [ ] Review backup integrity
- [ ] Test disaster recovery procedures
- [ ] Update security documentation

#### Quarterly Security Review

- [ ] Conduct penetration testing
- [ ] Review security architecture
- [ ] Update security policies
- [ ] Train team on security best practices
- [ ] Review compliance requirements

### 11. Compliance Considerations

#### GDPR Compliance

- [ ] Data encryption in transit and at rest
- [ ] User consent management
- [ ] Data retention policies
- [ ] Right to be forgotten implementation
- [ ] Data breach notification procedures

#### SOC 2 Compliance

- [ ] Access control policies
- [ ] Change management procedures
- [ ] Security monitoring and alerting
- [ ] Incident response procedures
- [ ] Regular security assessments

### 12. Emergency Contacts

#### Security Team Contacts

- **Security Lead**: security@yourcompany.com
- **DevOps Lead**: devops@yourcompany.com
- **System Administrator**: admin@yourcompany.com

#### External Contacts

- **SSL Certificate Provider**: Let's Encrypt
- **Backup Storage**: AWS S3
- **Monitoring Service**: Prometheus/Grafana

## Security Checklist for Production Deployment

Before deploying to production, ensure all items are completed:

### Pre-Deployment

- [ ] All secrets are properly configured
- [ ] SSL certificates are valid and installed
- [ ] Database is secured with strong passwords
- [ ] Firewall rules are configured
- [ ] Monitoring is set up
- [ ] Backup procedures are tested
- [ ] Security headers are configured
- [ ] Rate limiting is enabled
- [ ] Input validation is implemented
- [ ] Error handling doesn't expose sensitive data

### Post-Deployment

- [ ] All services are healthy
- [ ] SSL certificate is working
- [ ] Monitoring alerts are configured
- [ ] Backup is running successfully
- [ ] Log rotation is working
- [ ] Security scans pass
- [ ] Performance is acceptable
- [ ] Documentation is updated

## Security Tools and Resources

### Monitoring Tools

- **Prometheus**: Metrics collection
- **Grafana**: Visualization and alerting
- **Fluent Bit**: Log aggregation
- **Fail2ban**: Intrusion prevention

### Security Testing Tools

- **OWASP ZAP**: Web application security testing
- **Nmap**: Network security scanning
- **Lynis**: System security auditing
- **ClamAV**: Malware detection

### Useful Commands

```bash
# Check for open ports
sudo netstat -tulpn

# Monitor failed login attempts
grep "Failed login" /var/log/auth.log

# Check SSL certificate expiration
openssl x509 -in cert.pem -text -noout | grep "Not After"

# Test backup restoration
docker-compose -f docker-compose.prod.yml exec -T postgres \
    pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" backup.sql
```

## Conclusion

Security is an ongoing process, not a one-time setup. Regular monitoring, updates, and audits are essential for maintaining a secure production environment.

For questions or security concerns, contact the security team immediately. 