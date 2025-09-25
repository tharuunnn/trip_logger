# Trip Logger - Environment Configuration Guide

## Overview

This project supports multiple environments (Development and Production) with different database configurations. The setup automatically detects the environment and configures the appropriate settings.

## Environment Files

- **`.env.development`** - Development environment (SQLite database)
- **`.env.production`** - Production environment (PostgreSQL database)
- **`.env`** - Active environment file (copied from one of the above)

## Quick Environment Switching

### Windows (Using Batch Script)

```bash
# Switch to Development (SQLite)
backend\switch_env.bat dev

# Switch to Production (PostgreSQL)
backend\switch_env.bat prod
```

### Linux/Mac (Using Shell Script)

```bash
# Switch to Development (SQLite)
./backend/switch_env.sh dev

# Switch to Production (PostgreSQL)
./backend/switch_env.sh prod
```

## Manual Environment Setup

### Development Environment (Local Testing)

1. **Use SQLite database** (default):
   ```bash
   cd backend
   python manage.py migrate
   python manage.py runserver
   ```

2. **Or use PostgreSQL locally**:
   ```bash
   # Set your local PostgreSQL URL
   export DATABASE_URL=postgresql://user:password@localhost:5432/trip_logger_dev
   python manage.py migrate
   python manage.py runserver
   ```

### Production Environment (Render)

1. **Set environment variables in Render dashboard**:
   - `DATABASE_URL` - PostgreSQL connection string from your database service
   - `SECRET_KEY` - Random secret key for production
   - `RENDER` - Set to `true` (automatically set by Render)
   - `REDIS_URL` - Redis connection string from your Redis service

2. **Deploy to Render**:
   - Push your code to GitHub
   - Render will automatically detect the `render.yaml` and deploy both frontend and backend

## Database Configuration

### Development
- **Database**: SQLite (`db.sqlite3`)
- **Location**: `backend/db.sqlite3`
- **Migrations**: Run `python manage.py migrate`

### Production
- **Database**: PostgreSQL (via Railway/Render database service)
- **Connection**: Configured via `DATABASE_URL` environment variable
- **Migrations**: Automatically handled by Render

## Environment Variables

| Variable | Development | Production | Description |
|----------|-------------|------------|-------------|
| `DEBUG` | `True` | `False` | Django debug mode |
| `DATABASE_URL` | `sqlite:///db.sqlite3` | PostgreSQL URL | Database connection |
| `SECRET_KEY` | Development key | Production key | Django secret key |
| `ALLOWED_HOSTS` | `localhost,127.0.0.1` | Render hostname | Allowed hostnames |
| `CORS_ALLOWED_ORIGINS` | All origins | Specific origins | CORS configuration |
| `REDIS_URL` | Local Redis | Render Redis | Cache configuration |
| `ORS_API_KEY` | Your API key | Your API key | OpenRouteService API |

## Verification

To check your current environment configuration:

```bash
# In Django shell
python manage.py shell -c "from django.conf import settings; print('DB:', settings.DATABASES['default']['ENGINE']); print('DEBUG:', settings.DEBUG); print('ALLOWED_HOSTS:', settings.ALLOWED_HOSTS)"
```

## Troubleshooting

### Database Connection Issues

1. **Check if migrations are applied**:
   ```bash
   python manage.py showmigrations
   python manage.py migrate
   ```

2. **Verify database connection**:
   ```bash
   python manage.py dbshell
   ```

3. **Check environment variables**:
   ```bash
   python manage.py shell -c "import os; print('DATABASE_URL:', os.environ.get('DATABASE_URL'))"
   ```

### Common Issues

- **"No module named 'dj_database_url'"**: Install requirements: `pip install -r requirements.txt`
- **"OperationalError"**: Database connection failed, check DATABASE_URL
- **"relation does not exist"**: Run migrations: `python manage.py migrate`

## API Endpoints

Your API will be available at:
- **Development**: `http://localhost:8000/api/`
- **Production**: `https://your-app-name.onrender.com/api/`

Frontend will be available at:
- **Development**: `http://localhost:5173`
- **Production**: `https://your-frontend-app.onrender.com`
