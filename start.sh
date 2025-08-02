#!/bin/bash

echo "🚀 Starting WaitLessQ Platform..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p backend/uploads
mkdir -p pwa-generator/static/icons
mkdir -p pwa-generator/templates

# Create default PWA icons if they don't exist
if [ ! -f "pwa-generator/static/icons/icon-192.png" ]; then
    echo "📱 Creating default PWA icons..."
    # Create a simple placeholder icon (you can replace this with actual icons)
    convert -size 192x192 xc:#3B82F6 -fill white -gravity center -pointsize 48 -annotate 0 "WQ" pwa-generator/static/icons/icon-192.png 2>/dev/null || echo "⚠️  Could not create icon-192.png (ImageMagick not installed)"
fi

if [ ! -f "pwa-generator/static/icons/icon-512.png" ]; then
    echo "📱 Creating default PWA icons..."
    # Create a simple placeholder icon (you can replace this with actual icons)
    convert -size 512x512 xc:#3B82F6 -fill white -gravity center -pointsize 128 -annotate 0 "WQ" pwa-generator/static/icons/icon-512.png 2>/dev/null || echo "⚠️  Could not create icon-512.png (ImageMagick not installed)"
fi

# Start the services
echo "🐳 Starting Docker services..."
docker-compose up -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 30

# Check if services are running
echo "🔍 Checking service status..."
if curl -s http://localhost:8000/health > /dev/null; then
    echo "✅ Backend API is running at http://localhost:8000"
else
    echo "❌ Backend API is not responding"
fi

if curl -s http://localhost:3000 > /dev/null; then
    echo "✅ Frontend Dashboard is running at http://localhost:3000"
else
    echo "❌ Frontend Dashboard is not responding"
fi

if curl -s http://localhost:5001/health > /dev/null; then
    echo "✅ PWA Generator is running at http://localhost:5001"
else
    echo "❌ PWA Generator is not responding"
fi

echo ""
echo "🎉 WaitLessQ Platform is starting up!"
echo ""
echo "📋 Access URLs:"
echo "   • Dashboard: http://localhost:3000"
echo "   • API Docs: http://localhost:8000/docs"
echo "   • PWA Generator: http://localhost:5001"
echo ""
echo "📚 Next steps:"
echo "   1. Open http://localhost:3000 in your browser"
echo "   2. Register a new account"
echo "   3. Create your first service provider"
echo "   4. Customize your PWA settings"
echo "   5. Generate your branded PWA"
echo ""
echo "🛠️  To stop the platform:"
echo "   docker-compose down"
echo ""
echo "📖 For more information, see README.md" 