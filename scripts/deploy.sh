
#!/bin/bash

# Deployment script
set -e

echo "🚀 Deploying Kalina AI..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ .env file not found. Please copy .env.example to .env and fill in your values."
    exit 1
fi

# Build and start the application
echo "🔨 Building and starting containers..."
docker-compose down
docker-compose build
docker-compose up -d

echo "⏳ Waiting for application to start..."
sleep 10

# Health check
echo "🏥 Performing health check..."
if curl -f http://localhost:3000/health > /dev/null 2>&1; then
    echo "✅ Application is running successfully!"
    echo "🌐 Access your application at: http://localhost:3000"
else
    echo "❌ Health check failed. Please check the logs:"
    echo "docker-compose logs kalina-app"
    exit 1
fi
