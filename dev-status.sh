#!/bin/bash

# WaitLessQ Development Status Script
# Shows status of all services

set -e

echo "📊 WaitLessQ Development Environment Status"
echo "==========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check service status
check_service() {
    local service_name=$1
    local url=$2
    local health_endpoint=$3
    
    local full_url="${url}${health_endpoint}"
    
    if curl -s "$full_url" > /dev/null 2>&1; then
        print_success "$service_name: $url"
        return 0
    else
        print_error "$service_name: Not responding"
        return 1
    fi
}

# Check PID files
check_pid_files() {
    echo ""
    print_status "Process Status:"
    
    local services=("backend" "frontend" "pwa-generator")
    local ports=("8000" "3000" "8001")
    local names=("Backend API" "Frontend" "PWA Generator")
    
    for i in "${!services[@]}"; do
        local service=${services[$i]}
        local port=${ports[$i]}
        local name=${names[$i]}
        local pid_file="logs/${service}.pid"
        
        if [ -f "$pid_file" ]; then
            local pid=$(cat "$pid_file")
            if ps -p $pid > /dev/null 2>&1; then
                print_success "$name: Running (PID: $pid, Port: $port)"
            else
                print_warning "$name: PID file exists but process not running"
            fi
        else
            print_warning "$name: No PID file found"
        fi
    done
}

# Main execution
main() {
    echo ""
    print_status "Checking service endpoints..."
    echo ""
    
    # Check service endpoints
    local backend_ok=false
    local frontend_ok=false
    local pwa_ok=false
    
    if check_service "Backend API" "http://localhost:8000" "/health"; then
        backend_ok=true
    fi
    
    if check_service "Frontend Dashboard" "http://localhost:3000" ""; then
        frontend_ok=true
    fi
    
    if check_service "PWA Generator" "http://localhost:8001" "/health"; then
        pwa_ok=true
    fi
    
    # Check PID files
    check_pid_files
    
    echo ""
    echo "📋 Access URLs:"
    echo "• Dashboard: http://localhost:3000"
    echo "• API Docs: http://localhost:8000/docs"
    echo "• PWA Generator: http://localhost:8001"
    echo ""
    
    # Summary
    local total_services=3
    local running_services=0
    
    if [ "$backend_ok" = true ]; then
        running_services=$((running_services + 1))
    fi
    
    if [ "$frontend_ok" = true ]; then
        running_services=$((running_services + 1))
    fi
    
    if [ "$pwa_ok" = true ]; then
        running_services=$((running_services + 1))
    fi
    
    echo "📊 Summary: $running_services/$total_services services running"
    echo ""
    
    if [ $running_services -eq $total_services ]; then
        print_success "All services are running! 🎉"
    elif [ $running_services -gt 0 ]; then
        print_warning "Some services are running. Check logs for issues."
    else
        print_error "No services are running. Run ./dev-start.sh to start them."
    fi
    
    echo ""
    echo "🛠️  Commands:"
    echo "• Start services: ./dev-start.sh"
    echo "• Stop services: ./dev-stop.sh"
    echo "• Check status: ./dev-status.sh"
    echo ""
}

# Run main function
main "$@" 