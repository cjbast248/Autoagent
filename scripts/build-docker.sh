
#!/bin/bash

# Build script for Docker deployment
set -e

echo "🐳 Building Kalina AI Docker images..."

# Build production image
echo "📦 Building production image..."
docker build -t kalina-ai:latest .

# Build development image
echo "🛠️ Building development image..."
docker build -f Dockerfile.dev -t kalina-ai:dev .

echo "✅ Docker images built successfully!"
echo ""
echo "To run the application:"
echo "Production: docker-compose up kalina-app"
echo "Development: docker-compose --profile dev up kalina-dev"
echo ""
echo "Don't forget to:"
echo "1. Copy .env.example to .env"
echo "2. Fill in your API keys in .env"
echo "3. Run: docker-compose up"
