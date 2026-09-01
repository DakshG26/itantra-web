#!/bin/bash
set -e

echo "===================================================="
echo "🚀 Starting iTantra Neural Transceiver (SIH26173)"
echo "===================================================="

# Check if .env exists
if [ ! -f .env ]; then
    echo "Creating .env from .env.example..."
    cp .env.example .env
fi

# Run Docker Compose
echo "Starting Docker services..."
docker compose up --build
