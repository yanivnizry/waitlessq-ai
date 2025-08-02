#!/bin/bash

# WaitLessQ Backup Script
# Automated backup for PostgreSQL database and application data

set -e

# Configuration
BACKUP_DIR="/backups"
POSTGRES_HOST="postgres"
POSTGRES_PORT="5432"
POSTGRES_DB="${POSTGRES_DB:-waitlessq}"
POSTGRES_USER="${POSTGRES_USER:-waitlessq_user}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
RETENTION_DAYS=30

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}WaitLessQ Backup Script${NC}"
echo "======================="
echo "Timestamp: $TIMESTAMP"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Function to log messages
log_message() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

log_error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1" >&2
}

log_warning() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

# Function to check if PostgreSQL is ready
wait_for_postgres() {
    log_message "Waiting for PostgreSQL to be ready..."
    until pg_isready -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB"; do
        log_warning "PostgreSQL is not ready yet. Waiting..."
        sleep 5
    done
    log_message "PostgreSQL is ready!"
}

# Function to create database backup
backup_database() {
    local backup_file="$BACKUP_DIR/postgres_backup_$TIMESTAMP.sql"
    local compressed_file="$backup_file.gz"
    
    log_message "Creating database backup..."
    
    # Create SQL dump
    if pg_dump -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
        --verbose --clean --no-owner --no-privileges --format=plain > "$backup_file"; then
        
        # Compress the backup
        gzip "$backup_file"
        log_message "Database backup created: $compressed_file"
        
        # Verify backup integrity
        if gunzip -t "$compressed_file"; then
            log_message "Backup integrity verified"
        else
            log_error "Backup integrity check failed!"
            return 1
        fi
    else
        log_error "Database backup failed!"
        return 1
    fi
}

# Function to backup application data (if mounted)
backup_app_data() {
    local app_data_dirs="/app/uploads /app/storage"
    local backup_file="$BACKUP_DIR/app_data_backup_$TIMESTAMP.tar.gz"
    
    log_message "Creating application data backup..."
    
    # Check if any app data directories exist
    local dirs_to_backup=""
    for dir in $app_data_dirs; do
        if [ -d "$dir" ] && [ "$(ls -A $dir 2>/dev/null)" ]; then
            dirs_to_backup="$dirs_to_backup $dir"
        fi
    done
    
    if [ -n "$dirs_to_backup" ]; then
        if tar -czf "$backup_file" $dirs_to_backup 2>/dev/null; then
            log_message "Application data backup created: $backup_file"
        else
            log_warning "Application data backup failed or no data to backup"
        fi
    else
        log_message "No application data to backup"
    fi
}

# Function to clean old backups
cleanup_old_backups() {
    log_message "Cleaning up backups older than $RETENTION_DAYS days..."
    
    # Remove old database backups
    find "$BACKUP_DIR" -name "postgres_backup_*.sql.gz" -type f -mtime +$RETENTION_DAYS -delete 2>/dev/null || true
    
    # Remove old app data backups
    find "$BACKUP_DIR" -name "app_data_backup_*.tar.gz" -type f -mtime +$RETENTION_DAYS -delete 2>/dev/null || true
    
    log_message "Cleanup completed"
}

# Function to generate backup report
generate_report() {
    local report_file="$BACKUP_DIR/backup_report_$TIMESTAMP.txt"
    
    cat > "$report_file" << EOF
WaitLessQ Backup Report
======================
Date: $(date)
Timestamp: $TIMESTAMP

Database Backup:
$(ls -lh "$BACKUP_DIR"/postgres_backup_$TIMESTAMP.sql.gz 2>/dev/null || echo "Not created")

Application Data Backup:
$(ls -lh "$BACKUP_DIR"/app_data_backup_$TIMESTAMP.tar.gz 2>/dev/null || echo "Not created")

Backup Directory Contents:
$(ls -lh "$BACKUP_DIR")

Disk Usage:
$(df -h "$BACKUP_DIR")
EOF

    log_message "Backup report generated: $report_file"
}

# Function to send notification (placeholder for future implementation)
send_notification() {
    local status=$1
    local message=$2
    
    # Placeholder for notification implementation
    # Could integrate with Slack, email, or monitoring systems
    log_message "Notification: $status - $message"
}

# Main backup process
main() {
    local start_time=$(date +%s)
    
    log_message "Starting backup process..."
    
    # Wait for PostgreSQL to be ready
    wait_for_postgres
    
    # Perform backups
    if backup_database; then
        backup_app_data
        cleanup_old_backups
        generate_report
        
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        
        log_message "Backup completed successfully in ${duration} seconds"
        send_notification "SUCCESS" "Backup completed successfully"
    else
        log_error "Backup process failed!"
        send_notification "FAILURE" "Backup process failed"
        exit 1
    fi
}

# Error handling
trap 'log_error "Backup script interrupted"; exit 1' INT TERM

# Run main function
main

log_message "Backup script finished"