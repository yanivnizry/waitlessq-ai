#!/bin/bash

# WaitLessQ Development Stop Script
# Stops all services gracefully

set -e

echo "🛑 Stopping WaitLessQ Development Environment..."
echo "================================================"

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

# Stop service by PID file
stop_service() {
    local service_name=$1
    local pid_file="logs/${service_name}.pid"
    
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if ps -p $pid > /dev/null 2>&1; then
            print_status "Stopping $service_name (PID: $pid)..."
            kill $pid
            sleep 2
            if ps -p $pid > /dev/null 2>&1; then
                print_warning "Force killing $service_name..."
                kill -9 $pid
            fi
            rm -f "$pid_file"
            print_success "$service_name stopped"
        else
            print_warning "$service_name was not running"
            rm -f "$pid_file"
        fi
    else
        print_warning "PID file for $service_name not found"
    fi
}

# Kill processes by port
kill_by_port() {
    local port=$1
    local service_name=$2
    
    local pids=$(lsof -ti:$port 2>/dev/null)
    if [ ! -z "$pids" ]; then
        print_status "Stopping $service_name on port $port..."
        echo $pids | xargs kill
        sleep 2
        local remaining_pids=$(lsof -ti:$port 2>/dev/null)
        if [ ! -z "$remaining_pids" ]; then
            print_warning "Force killing $service_name on port $port..."
            echo $remaining_pids | xargs kill -9
        fi
        print_success "$service_name stopped"
    else
        print_warning "$service_name was not running on port $port"
    fi
}

# Main execution
main() {
    print_status "Stopping all WaitLessQ services..."
    
    # Stop services by PID files
    stop_service "backend"
    stop_service "frontend"
    stop_service "pwa-generator"
    
    # Fallback: kill by port if PID files don't exist
    kill_by_port 8000 "Backend API"
    kill_by_port 3000 "Frontend"
    kill_by_port 8001 "PWA Generator"
    
    # Clean up log files
    if [ -d "logs" ]; then
        print_status "Cleaning up log files..."
        rm -f logs/*.log
        print_success "Log files cleaned"
    fi
    
    echo ""
    print_success "All WaitLessQ services stopped"
    echo ""
    echo "📋 Services stopped:"
    echo "• Backend API (port 8000)"
    echo "• Frontend Dashboard (port 3000)"
    echo "• PWA Generator (port 8001)"
    echo ""
    echo "🚀 To start services again: ./dev-start.sh"
    echo ""
}

# Run main function
main "$@" 