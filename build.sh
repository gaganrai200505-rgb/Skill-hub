#!/bin/bash
set -o errexit

# Change to backend directory
cd backend

# Install dependencies
pip install -r requirements.txt

# Create staticfiles directory
mkdir -p staticfiles

# Run migrations
python manage.py migrate

# Collect static files (essential for Jazzmin theme)
python manage.py collectstatic --no-input --clear

