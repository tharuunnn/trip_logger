#!/bin/bash
set -e

# Go into the backend folder
cd backend

# Apply migrations
python manage.py migrate --noinput

# Collect static files
python manage.py collectstatic --noinput

# Start the server with Gunicorn
exec gunicorn core.wsgi:application --bind 0.0.0.0:$PORT --workers 4
