#!/bin/bash

# WaitLessQ Development Help Script
# Shows available development commands

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

echo -e "${BOLD}${BLUE}🚀 WaitLessQ Development Commands${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

echo -e "${BOLD}${GREEN}Service Management:${NC}"
echo -e "  ${CYAN}./dev-start.sh${NC}      - Start all development services"
echo -e "  ${CYAN}./dev-stop.sh${NC}       - Stop all development services"
echo -e "  ${CYAN}./restart-dev.sh${NC}    - Restart all development services"
echo -e "  ${CYAN}./dev-status.sh${NC}     - Check status of all services"
echo ""

echo -e "${BOLD}${GREEN}Individual Services:${NC}"
echo -e "  ${YELLOW}Backend (FastAPI):${NC}"
echo -e "    cd backend && python -m uvicorn app.main:app --reload --port 8000"
echo -e "  ${YELLOW}Frontend (React):${NC}"
echo -e "    cd frontend && npm start"
echo -e "  ${YELLOW}PWA Generator:${NC}"
echo -e "    cd pwa-generator && python main.py"
echo ""

echo -e "${BOLD}${GREEN}Service URLs:${NC}"
echo -e "  ${CYAN}Frontend:${NC}           http://localhost:3000"
echo -e "  ${CYAN}Backend API:${NC}        http://localhost:8000"
echo -e "  ${CYAN}API Documentation:${NC}  http://localhost:8000/docs"
echo -e "  ${CYAN}PWA Generator:${NC}      http://localhost:8001"
echo ""

echo -e "${BOLD}${GREEN}Docker Commands:${NC}"
echo -e "  ${CYAN}docker-compose build${NC}     - Build all containers"
echo -e "  ${CYAN}docker-compose up${NC}        - Start all containers"
echo -e "  ${CYAN}docker-compose down${NC}      - Stop all containers"
echo -e "  ${CYAN}docker-compose logs -f${NC}   - View container logs"
echo ""

echo -e "${BOLD}${GREEN}Development Setup:${NC}"
echo -e "  ${CYAN}python -m venv .venv${NC}     - Create virtual environment"
echo -e "  ${CYAN}source .venv/bin/activate${NC} - Activate virtual environment"
echo -e "  ${CYAN}pip install -r backend/requirements.txt${NC} - Install backend deps"
echo -e "  ${CYAN}cd frontend && npm install${NC} - Install frontend deps"
echo ""

echo -e "${BOLD}${GREEN}Logs and Monitoring:${NC}"
echo -e "  ${CYAN}tail -f logs/backend.log${NC}      - View backend logs"
echo -e "  ${CYAN}tail -f logs/frontend.log${NC}     - View frontend logs"
echo -e "  ${CYAN}tail -f logs/pwa-generator.log${NC} - View PWA generator logs"
echo -e "  ${CYAN}tail -f logs/*.log${NC}            - View all logs"
echo ""

echo -e "${BOLD}${GREEN}Troubleshooting:${NC}"
echo -e "  ${YELLOW}Port conflicts:${NC}"
echo -e "    lsof -ti:3000 | xargs kill    # Kill process on port 3000"
echo -e "    lsof -ti:8000 | xargs kill    # Kill process on port 8000"
echo -e "  ${YELLOW}Permission issues:${NC}"
echo -e "    chmod +x *.sh                # Make scripts executable"
echo -e "  ${YELLOW}Dependencies:${NC}"
echo -e "    ./restart-dev.sh              # Restart if services are stuck"
echo ""

echo -e "${BOLD}${GREEN}Quick Actions:${NC}"
echo -e "  ${CYAN}./restart-dev.sh${NC}     - 🔄 Full restart (recommended for issues)"
echo -e "  ${CYAN}./dev-status.sh${NC}      - 📊 Check what's running"
echo -e "  ${CYAN}./dev-stop.sh${NC}        - 🛑 Stop everything cleanly"
echo ""

echo -e "${BOLD}${BLUE}💡 Tips:${NC}"
echo -e "  • Use ${CYAN}./restart-dev.sh${NC} when services are stuck or not responding"
echo -e "  • Check ${CYAN}./dev-status.sh${NC} to see which services are running"
echo -e "  • Log files are stored in ${CYAN}./logs/${NC} directory"
echo -e "  • All scripts create PID files for clean service management"
echo ""
