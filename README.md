# WaitLessQ - Service Provider Platform

A comprehensive web-based platform for service-based professionals to create branded client-facing PWAs with real-time queue management.

## Features

### For Service Providers
- **Custom Branded PWAs**: Each provider gets their own branded Progressive Web App
- **Appointment Scheduling**: Full control over availability and booking rules
- **Real-time Queue Management**: Live queue updates and management
- **Client Management**: View and manage client information
- **Analytics Dashboard**: Track appointments, queue performance, and client engagement
- **Customization**: Brand colors, logos, and messaging

### For Clients
- **Personalized PWA**: Installable app specific to each provider
- **Easy Booking**: Simple appointment scheduling interface
- **Real-time Updates**: Live notifications about delays and queue status
- **Standby Queue**: Join waitlists for last-minute availability
- **Push Notifications**: Stay informed about appointment changes

## Tech Stack

- **Backend**: FastAPI (Python)
- **Frontend**: React with TypeScript
- **Database**: PostgreSQL
- **Real-time**: WebSocket (Socket.IO)
- **PWA**: Service Workers, Manifest
- **Deployment**: Docker, Docker Compose

## Project Structure

```
waitlessq/
├── backend/                 # FastAPI backend
│   ├── app/
│   │   ├── api/            # API routes
│   │   ├── core/           # Configuration, security
│   │   ├── models/         # Database models
│   │   ├── schemas/        # Pydantic schemas
│   │   └── services/       # Business logic
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/               # React dashboard
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── pages/          # Page components
│   │   ├── services/       # API services
│   │   └── utils/          # Utilities
│   ├── package.json
│   └── Dockerfile
├── pwa-generator/          # Dynamic PWA generation
│   ├── templates/          # PWA templates
│   └── generator.py        # PWA generation logic
├── docker-compose.yml      # Development environment
└── README.md
```

## Quick Start

1. **Clone and setup**:
   ```bash
   git clone <repository>
   cd waitlessq
   ```

2. **Start with Docker**:
   ```bash
   docker-compose up -d
   ```

3. **Access the platform**:
   - Dashboard: http://localhost:3000
   - API: http://localhost:8000
   - API Docs: http://localhost:8000/docs

## Development

### Backend Development
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend Development
```bash
cd frontend
npm install
npm start
```

## Environment Variables

Create `.env` files in each service directory:

**Backend (.env)**:
```
DATABASE_URL=postgresql://user:password@localhost/waitlessq
SECRET_KEY=your-secret-key
JWT_SECRET=your-jwt-secret
```

**Frontend (.env)**:
```
REACT_APP_API_URL=http://localhost:8000
REACT_APP_WS_URL=ws://localhost:8000
```

## API Documentation

Once running, visit http://localhost:8000/docs for interactive API documentation.

## License

MIT License 