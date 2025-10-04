#!/bin/bash

# Production deployment script for SRHR Chatbot

echo "Starting SRHR Chatbot deployment..."

# Install dependencies
pip install -r requirements.txt

# Create logs directory
mkdir -p logs

# Set proper permissions
chmod +x deploy.sh

# Start with Gunicorn
echo "Starting Gunicorn server..."
exec gunicorn --config gunicorn.conf.py app:app