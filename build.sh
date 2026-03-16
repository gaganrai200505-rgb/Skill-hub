#!/bin/bash
set -o errexit

echo "Starting build process..."

# Change to backend directory
cd backend

# Install dependencies
echo "Installing Python dependencies..."
pip install -r requirements.txt

# Remove old static files
echo "Removing old static files..."
rm -rf staticfiles || true

# Create staticfiles directory
echo "Creating staticfiles directory..."
mkdir -p staticfiles

# Run migrations
echo "Running database migrations..."
python manage.py migrate --noinput

# Collect static files with verbose output
echo "Collecting static files..."
python manage.py collectstatic --no-input --verbosity 2

echo "Build complete!"

