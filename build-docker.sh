#!/bin/bash

# Build script for Aether Panel Docker image

set -e

echo "Building Aether Panel Docker image..."

# Build the image
docker build -t aether-panel:latest .

echo "Build complete!"
echo "To run the container, use:"
echo "  docker-compose up -d"
echo "Or manually:"
echo "  docker run -d --name aether-panel -p 5000:5000 --env-file .env aether-panel:latest"

