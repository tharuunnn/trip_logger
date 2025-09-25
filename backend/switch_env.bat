@echo off

REM Environment Switcher Script for Trip Logger (Windows)
REM Usage: switch_env.bat [dev|prod]

set ENVIRONMENT=%1
if "%ENVIRONMENT%"=="" set ENVIRONMENT=dev

if "%ENVIRONMENT%"=="prod" (
    echo 🔄 Switching to PRODUCTION environment...

    REM Copy production environment file to .env
    copy .env.production .env >nul 2>&1

    REM Set environment variables for production
    set DATABASE_URL=%DATABASE_URL%
    set DEBUG=False
    set RENDER=true

    echo ✅ Production environment activated!
    echo 📝 Remember to set your DATABASE_URL and other production variables
    echo 🔗 Your app will use PostgreSQL database
) else if "%ENVIRONMENT%"=="dev" (
    echo 🔄 Switching to DEVELOPMENT environment...

    REM Copy development environment file to .env
    copy .env.development .env >nul 2>&1

    REM Clear production environment variables
    set DATABASE_URL=
    set DEBUG=True
    set RENDER=

    echo ✅ Development environment activated!
    echo 💾 Your app will use SQLite database (db.sqlite3)
    echo 🔧 Run 'python manage.py migrate' if needed
) else (
    echo ❌ Invalid environment: %ENVIRONMENT%
    echo 📖 Usage: switch_env.bat [dev^|prod]
    exit /b 1
)

echo.
echo 🌍 Current Environment: %ENVIRONMENT%
echo 🔍 To verify: python manage.py shell -c "from django.conf import settings; print('DB:', settings.DATABASES['default']['ENGINE']); print('DEBUG:', settings.DEBUG)"
echo.
