#!/bin/bash

# WaitLessQ Development Startup Script
# Starts all services for development

set -e

echo "🚀 Starting WaitLessQ Development Environment..."
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

# Check if Python and Node.js are available
check_dependencies() {
    print_status "Checking dependencies..."
    
    if ! command -v python3 &> /dev/null; then
        print_error "Python 3 is not installed"
        exit 1
    fi
    
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed"
        exit 1
    fi
    
    print_success "Dependencies check passed"
}

# Setup backend environment
setup_backend() {
    print_status "Setting up backend..."
    
    cd backend
    
    # Check if virtual environment exists
    if [ ! -d "venv" ]; then
        print_warning "Virtual environment not found, creating one..."
        python3 -m venv venv
    fi
    
    # Activate virtual environment
    source venv/bin/activate
    
    # Install dependencies
    print_status "Installing backend dependencies..."
    pip install -r requirements.txt 2>/dev/null || pip install fastapi uvicorn sqlalchemy pydantic pydantic-settings python-jose passlib python-multipart redis httpx
    
    cd ..
    print_success "Backend setup complete"
}

# Setup frontend environment
setup_frontend() {
    print_status "Setting up frontend..."
    
    cd frontend
    
    # Check if node_modules exists
    if [ ! -d "node_modules" ]; then
        print_warning "Node modules not found, installing dependencies..."
        npm install
    fi
    
    cd ..
    print_success "Frontend setup complete"
}

# Setup PWA generator
setup_pwa_generator() {
    print_status "Setting up PWA generator..."
    
    cd pwa-generator
    
    # Install dependencies if requirements.txt exists
    if [ -f "requirements.txt" ]; then
        pip install -r requirements.txt 2>/dev/null || pip install fastapi uvicorn httpx
    else
        pip install fastapi uvicorn httpx
    fi
    
    cd ..
    print_success "PWA generator setup complete"
}

# Start backend service
start_backend() {
    print_status "Starting backend API server..."
    
    cd backend
    source venv/bin/activate
    
    # Start backend in background
    python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload > ../logs/backend.log 2>&1 &
    BACKEND_PID=$!
    echo $BACKEND_PID > ../logs/backend.pid
    
    cd ..
    print_success "Backend started (PID: $BACKEND_PID)"
}

# Start frontend service
start_frontend() {
    print_status "Starting frontend development server..."
    
    cd frontend
    
    # Start frontend in background
    npm start > ../logs/frontend.log 2>&1 &
    FRONTEND_PID=$!
    echo $FRONTEND_PID > ../logs/frontend.pid
    
    cd ..
    print_success "Frontend started (PID: $FRONTEND_PID)"
}

# Start PWA generator service
start_pwa_generator() {
    print_status "Starting PWA generator service..."
    
    cd pwa-generator
    
    # Start PWA generator in background with BACKEND_BASE_URL and PWA_BASE_URL environment variables
    BACKEND_BASE_URL=http://localhost:8000 BACKEND_URL=http://localhost:8000 PWA_BASE_URL=http://localhost:8001 python -m uvicorn main:app --host 0.0.0.0 --port 8001 --reload > ../logs/pwa-generator.log 2>&1 &
    PWA_PID=$!
    echo $PWA_PID > ../logs/pwa-generator.pid
    
    cd ..
    print_success "PWA generator started (PID: $PWA_PID)"
}

# Wait for services to be ready
wait_for_services() {
    print_status "Waiting for services to be ready..."
    
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        echo -n "."
        
        # Check backend
        if curl -s http://localhost:8000/health > /dev/null 2>&1; then
            BACKEND_READY=true
        fi
        
        # Check frontend
        if curl -s http://localhost:3000 > /dev/null 2>&1; then
            FRONTEND_READY=true
        fi
        
        # Check PWA generator
        if curl -s http://localhost:5001/health > /dev/null 2>&1; then
            PWA_READY=true
        fi
        
        # If all services are ready, break
        if [ "$BACKEND_READY" = true ] && [ "$FRONTEND_READY" = true ] && [ "$PWA_READY" = true ]; then
            break
        fi
        
        sleep 2
        attempt=$((attempt + 1))
    done
    
    echo ""
}

# Display service status
show_status() {
    echo ""
    echo "🎉 WaitLessQ Development Environment Status"
    echo "=========================================="
    echo ""
    
    # Check backend
    if curl -s http://localhost:8000/health > /dev/null 2>&1; then
        print_success "Backend API: http://localhost:8000"
    else
        print_error "Backend API: Not responding"
    fi
    
    # Check frontend
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
        print_success "Frontend Dashboard: http://localhost:3000"
    else
        print_error "Frontend Dashboard: Not responding"
    fi
    
    # Check PWA generator
    if curl -s http://localhost:8001/health > /dev/null 2>&1; then
        print_success "PWA Generator: http://localhost:8001"
    else
        print_error "PWA Generator: Not responding"
    fi
    
    echo ""
    echo "📋 Access URLs:"
    echo "• Dashboard: http://localhost:3000"
    echo "• API Docs: http://localhost:8000/docs"
    echo "• PWA Generator: http://localhost:8001"
    echo ""
    echo "🚀 Next steps:"
    echo "1. Open http://localhost:3000 in your browser"
    echo "2. Register a new account"
    echo "3. Create your first service provider"
    echo "4. Customize your PWA settings"
    echo "5. Generate your branded PWA"
    echo ""
    echo "🛑 To stop all services: ./dev-stop.sh"
    echo ""
}

# Create logs directory
mkdir -p logs

# Main execution
main() {
    print_status "Initializing WaitLessQ development environment..."
    
    # Check dependencies
    check_dependencies
    
    # Setup environments
    setup_backend
    setup_frontend
    setup_pwa_generator
    
    # Start services
    start_backend
    start_frontend
    start_pwa_generator
    
    # Wait for services
    wait_for_services
    
    # Show status
    show_status
}

# Run main function
main "$@" 