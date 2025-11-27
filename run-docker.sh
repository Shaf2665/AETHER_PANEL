#!/bin/bash

# Run script for Aether Panel Docker container

set -e

if [ ! -f .env ]; then
    echo "Error: .env file not found!"
    echo "Please create a .env file from backend/.env.example"
    exit 1
fi

echo "Starting Aether Panel with Docker Compose..."

# Start services
docker-compose up -d

echo "Services started!"
echo "Waiting for services to be healthy..."

# Wait a bit for services to start
sleep 5

# Check health
echo "Checking service health..."
docker-compose ps

echo ""
echo "Aether Panel should be available at: http://localhost:5000"
echo "Health check: http://localhost:5000/health"
echo ""
echo "To view logs: docker-compose logs -f aether-panel"
echo "To stop: docker-compose down"

