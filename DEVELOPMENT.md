# WaitLessQ Development Guide

This guide provides comprehensive information for developers working on the WaitLessQ platform.

## Architecture Overview

WaitLessQ is built as a microservices architecture with the following components:

### Backend Services
- **FastAPI Backend** (Port 8000): Main API server with authentication, business logic, and data management
- **PWA Generator** (Port 5001): Dynamic PWA generation service for each provider
- **PostgreSQL**: Primary database for all data persistence
- **Redis**: Caching and session management

### Frontend
- **React Dashboard** (Port 3000): Provider management interface
- **Dynamic PWAs**: Generated for each provider with custom branding

## Development Setup

### Prerequisites
- Docker & Docker Compose
- Node.js 18+ (for local frontend development)
- Python 3.11+ (for local backend development)
- Git

### Quick Start
```bash
# Clone the repository
git clone <repository-url>
cd waitlessq

# Start all services
./start.sh

# Or manually with Docker Compose
docker-compose up -d
```

### Local Development

#### Backend Development
```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set environment variables
export DATABASE_URL="postgresql://waitlessq_user:waitlessq_password@localhost:5432/waitlessq"
export REDIS_URL="redis://localhost:6379"
export SECRET_KEY="your-secret-key"
export JWT_SECRET="your-jwt-secret"

# Run migrations (if using Alembic)
alembic upgrade head

# Start development server
uvicorn app.main:app --reload --port 8000
```

#### Frontend Development
```bash
cd frontend

# Install dependencies
npm install

# Set environment variables
export REACT_APP_API_URL="http://localhost:8000"
export REACT_APP_WS_URL="ws://localhost:8000"

# Start development server
npm start
```

#### PWA Generator Development
```bash
cd pwa-generator

# Create virtual environment
python -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Set environment variables
export BACKEND_URL="http://localhost:8000"

# Start development server
uvicorn main:app --reload --port 5001
```

## Database Schema

### Core Tables

#### Users
- Authentication and user management
- Profile information and settings

#### Providers
- Business information and settings
- PWA configuration and branding
- Operating hours and availability

#### Appointments
- Scheduled appointments
- Client information
- Service details and status

#### Queues
- Real-time queue management
- Queue entries with client info
- Status tracking and notifications

#### PWA Configs
- PWA-specific settings
- Branding and customization
- Feature toggles

## API Documentation

### Authentication
- JWT-based authentication
- Token refresh mechanism
- Role-based access control

### Endpoints

#### Auth (`/api/v1/auth/`)
- `POST /register` - User registration
- `POST /login` - User login
- `GET /me` - Get current user
- `POST /refresh` - Refresh token

#### Providers (`/api/v1/providers/`)
- `GET /` - List providers
- `POST /` - Create provider
- `GET /{id}` - Get provider details
- `PUT /{id}` - Update provider
- `DELETE /{id}` - Delete provider

#### Appointments (`/api/v1/appointments/`)
- `GET /` - List appointments
- `POST /` - Create appointment
- `GET /{id}` - Get appointment details
- `PUT /{id}` - Update appointment
- `DELETE /{id}` - Cancel appointment

#### Queues (`/api/v1/queues/`)
- `GET /` - List queues
- `POST /` - Create queue
- `GET /{id}` - Get queue details
- `PUT /{id}` - Update queue
- `GET /{id}/entries` - Get queue entries
- `POST /{id}/entries` - Add to queue
- `PUT /{id}/entries/{entry_id}` - Update queue entry
- `DELETE /{id}/entries/{entry_id}` - Remove from queue

#### PWA (`/api/v1/pwa/`)
- `GET /config/{provider_id}` - Get PWA config
- `PUT /config/{provider_id}` - Update PWA config
- `POST /generate/{provider_id}` - Generate PWA

## PWA Generation

### Template System
The PWA generator uses Jinja2 templates to create dynamic PWAs:

- `templates/index.html` - Main PWA HTML
- `templates/styles.css` - Dynamic CSS with provider colors
- `templates/app.js` - PWA JavaScript functionality
- `templates/sw.js` - Service Worker for offline functionality

### Customization
Each provider's PWA can be customized with:
- Brand colors and logos
- Custom messages and instructions
- Feature toggles (appointments, queue, notifications)
- Custom CSS and JavaScript

## Real-time Features

### WebSocket Integration
- Real-time queue updates
- Live appointment notifications
- Client status tracking

### Push Notifications
- Appointment reminders
- Queue position updates
- Service notifications

## Testing

### Backend Testing
```bash
cd backend

# Run tests
pytest

# Run with coverage
pytest --cov=app

# Run specific test file
pytest tests/test_auth.py
```

### Frontend Testing
```bash
cd frontend

# Run tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific test
npm test -- --testNamePattern="Login"
```

### Integration Testing
```bash
# Run integration tests
docker-compose -f docker-compose.test.yml up --abort-on-container-exit
```

## Deployment

### Production Setup
1. Set up production environment variables
2. Configure SSL certificates
3. Set up database backups
4. Configure monitoring and logging

### Docker Deployment
```bash
# Build production images
docker-compose -f docker-compose.prod.yml build

# Deploy to production
docker-compose -f docker-compose.prod.yml up -d
```

### Environment Variables

#### Backend
```bash
DATABASE_URL=postgresql://user:password@host:port/db
REDIS_URL=redis://host:port
SECRET_KEY=your-secret-key
JWT_SECRET=your-jwt-secret
CORS_ORIGINS=https://yourdomain.com
```

#### Frontend
```bash
REACT_APP_API_URL=https://api.yourdomain.com
REACT_APP_WS_URL=wss://api.yourdomain.com
```

#### PWA Generator
```bash
BACKEND_URL=https://api.yourdomain.com
```

## Contributing

### Code Style
- Backend: Follow PEP 8 with Black formatter
- Frontend: Use Prettier and ESLint
- TypeScript: Strict mode enabled

### Git Workflow
1. Create feature branch from `main`
2. Make changes with descriptive commits
3. Write tests for new functionality
4. Submit pull request with detailed description

### Code Review Checklist
- [ ] Code follows style guidelines
- [ ] Tests are written and passing
- [ ] Documentation is updated
- [ ] No security vulnerabilities
- [ ] Performance considerations addressed

## Troubleshooting

### Common Issues

#### Database Connection Issues
```bash
# Check if PostgreSQL is running
docker-compose ps postgres

# View logs
docker-compose logs postgres

# Reset database
docker-compose down -v
docker-compose up -d
```

#### Frontend Build Issues
```bash
# Clear node modules
rm -rf node_modules package-lock.json
npm install

# Clear cache
npm start -- --reset-cache
```

#### PWA Generation Issues
```bash
# Check template files
ls -la pwa-generator/templates/

# Verify provider data
curl http://localhost:8000/api/v1/providers/1

# Check PWA generator logs
docker-compose logs pwa-generator
```

### Performance Optimization

#### Backend
- Database query optimization
- Redis caching for frequently accessed data
- Connection pooling
- Async/await for I/O operations

#### Frontend
- Code splitting and lazy loading
- Image optimization
- Bundle size optimization
- Service worker caching

#### PWA
- Static asset caching
- Offline functionality
- Progressive enhancement
- Performance monitoring

## Security Considerations

### Authentication
- JWT token expiration
- Secure password hashing
- Rate limiting
- CORS configuration

### Data Protection
- Input validation and sanitization
- SQL injection prevention
- XSS protection
- CSRF protection

### PWA Security
- HTTPS enforcement
- Content Security Policy
- Secure service worker implementation
- Safe external resource loading

## Monitoring and Logging

### Application Monitoring
- Health check endpoints
- Performance metrics
- Error tracking
- User analytics

### Logging
- Structured logging with JSON
- Log levels (DEBUG, INFO, WARNING, ERROR)
- Centralized log aggregation
- Log rotation and retention

## Future Enhancements

### Planned Features
- Multi-language support
- Advanced analytics dashboard
- SMS notifications
- Payment integration
- Advanced scheduling algorithms
- Mobile apps (React Native)

### Technical Improvements
- GraphQL API
- Microservices decomposition
- Event-driven architecture
- Advanced caching strategies
- Automated testing pipeline
- CI/CD optimization 