#!/bin/bash

# Restart Development Services Script
# This script stops all running development services and starts them again

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

print_error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

# Function to kill processes by port
kill_by_port() {
    local port=$1
    local service_name=$2
    
    print_status "Stopping $service_name on port $port..."
    
    # Find process using the port
    local pid=$(lsof -ti:$port 2>/dev/null || true)
    
    if [ ! -z "$pid" ]; then
        print_status "Found process $pid using port $port"
        kill -TERM $pid 2>/dev/null || true
        sleep 2
        
        # Force kill if still running
        if kill -0 $pid 2>/dev/null; then
            print_warning "Process $pid still running, force killing..."
            kill -KILL $pid 2>/dev/null || true
        fi
        
        print_success "$service_name stopped"
    else
        print_status "No process found on port $port"
    fi
}

# Function to kill processes by name pattern
kill_by_pattern() {
    local pattern=$1
    local service_name=$2
    
    print_status "Stopping $service_name processes..."
    
    # Find processes matching pattern
    local pids=$(pgrep -f "$pattern" 2>/dev/null || true)
    
    if [ ! -z "$pids" ]; then
        echo "$pids" | while read -r pid; do
            if [ ! -z "$pid" ]; then
                print_status "Killing process $pid ($service_name)"
                kill -TERM $pid 2>/dev/null || true
            fi
        done
        
        sleep 3
        
        # Force kill any remaining processes
        local remaining_pids=$(pgrep -f "$pattern" 2>/dev/null || true)
        if [ ! -z "$remaining_pids" ]; then
            echo "$remaining_pids" | while read -r pid; do
                if [ ! -z "$pid" ]; then
                    print_warning "Force killing remaining process $pid"
                    kill -KILL $pid 2>/dev/null || true
                fi
            done
        fi
        
        print_success "$service_name processes stopped"
    else
        print_status "No $service_name processes found"
    fi
}

# Function to wait for port to be free
wait_for_port_free() {
    local port=$1
    local max_wait=10
    local count=0
    
    while [ $count -lt $max_wait ]; do
        if ! lsof -ti:$port >/dev/null 2>&1; then
            return 0
        fi
        sleep 1
        count=$((count + 1))
    done
    
    print_error "Port $port is still in use after ${max_wait}s"
    return 1
}

# Function to check if a service is running
check_service() {
    local port=$1
    local service_name=$2
    local max_wait=30
    local count=0
    
    print_status "Waiting for $service_name to start on port $port..."
    
    while [ $count -lt $max_wait ]; do
        if curl -s http://localhost:$port >/dev/null 2>&1; then
            print_success "$service_name is running on port $port"
            return 0
        fi
        sleep 1
        count=$((count + 1))
        if [ $((count % 5)) -eq 0 ]; then
            print_status "Still waiting for $service_name... (${count}s)"
        fi
    done
    
    print_error "$service_name failed to start on port $port after ${max_wait}s"
    return 1
}

# Main script
main() {
    print_status "🔄 Starting development services restart..."
    
    # Step 1: Stop all services
    print_status "📛 Stopping all services..."
    
    # Stop by ports (more reliable)
    kill_by_port 3000 "Frontend (React)"
    kill_by_port 8000 "Backend (FastAPI)"
    kill_by_port 8001 "PWA Generator"
    
    # Stop by process patterns (backup)
    kill_by_pattern "craco.*start" "Frontend (CRACO)"
    kill_by_pattern "npm.*start" "Frontend (NPM)"
    kill_by_pattern "uvicorn.*app.main:app" "Backend (Uvicorn)"
    kill_by_pattern "python.*main.py" "PWA Generator"
    
    # Wait for ports to be free
    print_status "⏳ Waiting for ports to be free..."
    wait_for_port_free 3000
    wait_for_port_free 8000
    wait_for_port_free 8001
    
    sleep 2
    
    # Step 2: Start all services
    print_status "🚀 Starting all services..."
    
    # Check if virtual environment exists
    if [ ! -d ".venv" ]; then
        print_error "Virtual environment not found. Please run 'python -m venv .venv' first"
        exit 1
    fi
    
    # Start Backend
    print_status "Starting Backend (FastAPI)..."
    source .venv/bin/activate
    cd backend
    python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 > ../logs/backend.log 2>&1 &
    BACKEND_PID=$!
    cd ..
    
    # Start PWA Generator
    print_status "Starting PWA Generator..."
    cd pwa-generator
    BACKEND_URL=http://localhost:8000 python -m uvicorn main:app --reload --host 0.0.0.0 --port 8001 > ../logs/pwa-generator.log 2>&1 &
    PWA_PID=$!
    cd ..
    
    # Start Frontend
    print_status "Starting Frontend (React)..."
    cd frontend
    npm start > ../logs/frontend.log 2>&1 &
    FRONTEND_PID=$!
    cd ..
    
    # Create logs directory if it doesn't exist
    mkdir -p logs
    
    # Save PIDs for later reference
    echo $BACKEND_PID > logs/backend.pid
    echo $PWA_PID > logs/pwa-generator.pid
    echo $FRONTEND_PID > logs/frontend.pid
    
    print_status "📋 Process IDs saved:"
    print_status "  Backend PID: $BACKEND_PID"
    print_status "  PWA Generator PID: $PWA_PID"
    print_status "  Frontend PID: $FRONTEND_PID"
    
    # Step 3: Health checks
    print_status "🏥 Performing health checks..."
    
    # Check backend
    if check_service 8000 "Backend"; then
        print_success "✅ Backend is healthy"
    else
        print_error "❌ Backend health check failed"
        print_status "Backend logs:"
        tail -20 logs/backend.log 2>/dev/null || echo "No backend logs available"
    fi
    
    # Check PWA Generator
    if check_service 8001 "PWA Generator"; then
        print_success "✅ PWA Generator is healthy"
    else
        print_error "❌ PWA Generator health check failed"
        print_status "PWA Generator logs:"
        tail -20 logs/pwa-generator.log 2>/dev/null || echo "No PWA generator logs available"
    fi
    
    # Check frontend
    if check_service 3000 "Frontend"; then
        print_success "✅ Frontend is healthy"
    else
        print_error "❌ Frontend health check failed"
        print_status "Frontend logs:"
        tail -20 logs/frontend.log 2>/dev/null || echo "No frontend logs available"
    fi
    
    # Final status
    print_success "🎉 Development services restart completed!"
    print_status ""
    print_status "🌐 Services are running on:"
    print_status "  Frontend:      http://localhost:3000"
    print_status "  Backend API:   http://localhost:8000"
    print_status "  API Docs:      http://localhost:8000/docs"
    print_status "  PWA Generator: http://localhost:8001"
    print_status ""
    print_status "📋 To monitor services:"
    print_status "  ./dev-status.sh     - Check service status"
    print_status "  ./dev-stop.sh       - Stop all services"
    print_status "  tail -f logs/*.log  - View logs"
    print_status ""
    print_status "📁 Log files are available in ./logs/"
}

# Run main function
main "$@"
