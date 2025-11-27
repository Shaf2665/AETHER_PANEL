#!/bin/bash

# Build script for Aether Dashboard Docker image

set -e

echo "Building Aether Dashboard Docker image..."

# Build the image
docker build -t aether-dashboard:latest .

echo "Build complete!"
echo "To run the container, use:"
echo "  docker-compose up -d"
echo "Or manually:"
echo "  docker run -d --name aether-dashboard -p 5000:5000 --env-file .env aether-dashboard:latest"

