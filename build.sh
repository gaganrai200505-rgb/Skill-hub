#!/bin/bash
set -o errexit

echo "Starting build process..."

# Change to backend directory
cd backend
pwd
echo "Current directory confirmed above ☝️"

# Install dependencies
echo "Installing Python dependencies..."
pip install -r requirements.txt

# Remove old static files
echo "Removing old static files..."
rm -rf staticfiles || true

# Create staticfiles directory
echo "Creating staticfiles directory..."
mkdir -p staticfiles

# Run migrations with full output
echo "=================================="
echo "Running database migrations..."
echo "=================================="
python manage.py migrate --noinput --verbosity 2 || {
    echo "ERROR: Migrations failed!"
    exit 1
}

# Collect static files with full output
echo "=================================="
echo "Collecting static files..."
echo "=================================="
python manage.py collectstatic --no-input --verbosity 3 || {
    echo "ERROR: Static files collection failed!"
    exit 1
}

# Create superuser if it doesn't exist (for initial deploy)
echo "=================================="
echo "Checking for admin user..."
echo "=================================="
python manage.py shell -c "
from users.models import CustomUser
try:
    admin = CustomUser.objects.get(username='admin')
    print(f'✅ Admin user already exists: {admin.username}')
except CustomUser.DoesNotExist:
    print('ℹ️ No admin user found. You can create one after deployment.')
" || true

echo "=================================="
echo "✅ Build complete!"
echo "=================================="

