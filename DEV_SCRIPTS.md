# WaitLessQ Development Scripts

Simple scripts to manage the WaitLessQ development environment.

## 🚀 Quick Start

### Start All Services
```bash
./dev-start.sh
```

This will:
- ✅ Check dependencies (Python 3, Node.js, npm)
- ✅ Setup backend environment (virtual env, dependencies)
- ✅ Setup frontend environment (node_modules)
- ✅ Setup PWA generator environment
- ✅ Start all services in background
- ✅ Wait for services to be ready
- ✅ Show status and access URLs

### Stop All Services
```bash
./dev-stop.sh
```

This will:
- ✅ Stop all services gracefully
- ✅ Clean up PID files
- ✅ Clean up log files

### Check Service Status
```bash
./dev-status.sh
```

This will:
- ✅ Check if services are responding
- ✅ Show process status
- ✅ Display access URLs
- ✅ Provide summary

## 📋 Services

| Service | Port | URL | Description |
|---------|------|-----|-------------|
| Frontend Dashboard | 3000 | http://localhost:3000 | React development server |
| Backend API | 8000 | http://localhost:8000 | FastAPI backend server |
| PWA Generator | 5001 | http://localhost:5001 | PWA generation service |

## 🛠️ Features

### Automatic Setup
- Creates virtual environment if missing
- Installs dependencies automatically
- Handles missing node_modules
- Graceful error handling

### Process Management
- Tracks PIDs for clean shutdown
- Logs output to `logs/` directory
- Health checks for all services
- Colored output for better UX

### Development Friendly
- Hot reload for all services
- Background execution
- Status monitoring
- Easy start/stop/status commands

## 📁 File Structure

```
waitlessq/
├── dev-start.sh      # Start all services
├── dev-stop.sh       # Stop all services
├── dev-status.sh     # Check service status
├── logs/             # Service logs and PID files
│   ├── backend.log
│   ├── frontend.log
│   ├── pwa-generator.log
│   ├── backend.pid
│   ├── frontend.pid
│   └── pwa-generator.pid
├── backend/          # Backend service
├── frontend/         # Frontend service
└── pwa-generator/    # PWA generator service
```

## 🔧 Troubleshooting

### Services Not Starting
1. Check dependencies: `python3 --version && node --version`
2. Check logs: `cat logs/*.log`
3. Check ports: `lsof -i :3000,8000,5001`
4. Restart: `./dev-stop.sh && ./dev-start.sh`

### Port Conflicts
If ports are already in use:
```bash
# Kill processes on specific ports
lsof -ti:3000 | xargs kill -9
lsof -ti:8000 | xargs kill -9
lsof -ti:5001 | xargs kill -9
```

### Permission Issues
```bash
chmod +x dev-start.sh dev-stop.sh dev-status.sh
```

## 🎯 Usage Examples

### First Time Setup
```bash
# Start all services (will setup everything automatically)
./dev-start.sh
```

### Daily Development
```bash
# Start services
./dev-start.sh

# Check status
./dev-status.sh

# Stop services when done
./dev-stop.sh
```

### Quick Status Check
```bash
./dev-status.sh
```

## 📝 Logs

Service logs are stored in the `logs/` directory:
- `backend.log` - Backend API logs
- `frontend.log` - Frontend development server logs
- `pwa-generator.log` - PWA generator logs

## 🚨 Important Notes

- Services run in background with hot reload
- PID files are used for clean shutdown
- All services must be stopped before starting again
- Logs are cleaned up when stopping services
- Health checks ensure services are ready before showing status

## 🔄 Workflow

1. **Start**: `./dev-start.sh`
2. **Develop**: Make changes (hot reload enabled)
3. **Check**: `./dev-status.sh` (optional)
4. **Stop**: `./dev-stop.sh`

That's it! Simple and efficient development workflow. 🎉 