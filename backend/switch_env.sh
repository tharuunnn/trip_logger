#!/bin/bash

# Environment Switcher Script for Trip Logger
# Usage: ./switch_env.sh [dev|prod]

ENVIRONMENT=${1:-dev}

if [ "$ENVIRONMENT" = "prod" ]; then
    echo "🔄 Switching to PRODUCTION environment..."

    # Copy production environment file to .env
    cp .env.production .env

    # Set environment variables for production
    export DATABASE_URL=${DATABASE_URL:-"postgresql://your-prod-db-url"}
    export DEBUG=False
    export RENDER=true

    echo "✅ Production environment activated!"
    echo "📝 Remember to set your DATABASE_URL and other production variables"
    echo "🔗 Your app will use PostgreSQL database"

elif [ "$ENVIRONMENT" = "dev" ]; then
    echo "🔄 Switching to DEVELOPMENT environment..."

    # Copy development environment file to .env
    cp .env.development .env

    # Clear production environment variables
    unset DATABASE_URL
    export DEBUG=True
    unset RENDER

    echo "✅ Development environment activated!"
    echo "💾 Your app will use SQLite database (db.sqlite3)"
    echo "🔧 Run 'python manage.py migrate' if needed"

else
    echo "❌ Invalid environment: $ENVIRONMENT"
    echo "📖 Usage: ./switch_env.sh [dev|prod]"
    exit 1
fi

echo ""
echo "🌍 Current Environment: $ENVIRONMENT"
echo "🔍 To verify: python manage.py shell -c 'from django.conf import settings; print(\"DB:\", settings.DATABASES[\"default\"][\"ENGINE\"]); print(\"DEBUG:\", settings.DEBUG)'"
