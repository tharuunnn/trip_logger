# Trip Logger - Full Stack Application

A comprehensive trip logging application designed for US truckers, featuring route calculation, ELD compliance tracking, and daily log management.

## 🚛 Features

- **Trip Management**: Create and manage trucking trips with pickup/dropoff locations
- **Route Calculation**: Automatic route planning with OpenRouteService API integration
- **ELD Compliance**: Real-time compliance checking with federal regulations
- **Daily Logs**: Visual timeline of driving hours, rest breaks, and duty status
- **Interactive Maps**: Route visualization with Leaflet maps
- **Real-time Updates**: Dynamic data refresh without page reloads

## 🏗️ Architecture

- **Backend**: Django + Django REST Framework
- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Database**: SQLite (development) / PostgreSQL (production)
- **Maps**: Leaflet + OpenRouteService API
- **Caching**: Redis for route calculation caching
- **Rate Limiting**: API call management

## 📋 Prerequisites

- Python 3.11+
- Node.js 18+
- Redis (for caching)
- OpenRouteService API key

## 🚀 Quick Start

### Backend Setup

1. **Navigate to backend directory:**

   ```bash
   cd backend
   ```

2. **Create and activate virtual environment:**

   ```bash
   python -m venv venv

   # Windows
   venv\Scripts\activate

   # macOS/Linux
   source venv/bin/activate
   ```

3. **Install dependencies:**

   ```bash
   pip install -r requirements.txt
   ```

4. **Create environment file:**

   ```bash
   # Create .env file in backend directory
   echo "ORS_API_KEY=your_openrouteservice_api_key_here" > .env
   echo "DEBUG=True" >> .env
   ```

5. **Run database migrations:**

   ```bash
   python manage.py makemigrations
   python manage.py migrate
   ```

6. **Create superuser (optional):**

   ```bash
   python manage.py createsuperuser
   ```

7. **Start Redis server:**

   ```bash
   # Windows (if Redis is installed)
   redis-server

   # macOS (with Homebrew)
   brew services start redis

   # Linux
   sudo systemctl start redis
   ```

8. **Start Django development server:**

   ```bash
   python manage.py runserver
   ```

   Backend will be available at `http://localhost:8000`

### Frontend Setup

1. **Navigate to frontend directory:**

   ```bash
   cd frontend
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Start development server:**

   ```bash
   npm run dev
   ```

   Frontend will be available at `http://localhost:5173`

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the `backend` directory:

```env
# OpenRouteService API Key (required)
ORS_API_KEY=your_api_key_here

# Django Settings
DEBUG=True
SECRET_KEY=your-secret-key-here

# Database (optional - defaults to SQLite)
DATABASE_URL=postgresql://user:password@localhost:5432/trip_logger

# Redis (optional - for caching)
REDIS_URL=redis://localhost:6379/1
```

### OpenRouteService API Key

1. Sign up at [OpenRouteService](https://openrouteservice.org/)
2. Get your free API key
3. Add it to your `.env` file

## 📁 Project Structure

```
trip_logger/
├── backend/                 # Django backend
│   ├── core/               # Django project settings
│   ├── trips/              # Trips app
│   │   ├── models.py       # Database models
│   │   ├── views.py        # API views
│   │   ├── serializers.py  # DRF serializers
│   │   ├── urls.py         # URL routing
│   │   └── utils.py        # Route calculation logic
│   ├── manage.py
│   └── requirements.txt
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/         # Page components
│   │   ├── services/      # API services
│   │   ├── utils/         # Utility functions
│   │   └── hooks/         # Custom React hooks
│   ├── package.json
│   └── vite.config.ts
├── .gitignore
└── README.md
```

## 🛠️ Development

### Backend Development

```bash
# Activate virtual environment
source venv/bin/activate  # macOS/Linux
# or
venv\Scripts\activate    # Windows

# Run migrations
python manage.py makemigrations
python manage.py migrate

# Start development server
python manage.py runserver

# Run tests
python manage.py test
```

### Frontend Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run linting
npm run lint
```

## 🚀 Deployment

### Frontend (Vercel)

1. **Build the project:**

   ```bash
   cd frontend
   npm run build
   ```

2. **Deploy to Vercel:**
   - Connect your GitHub repository to Vercel
   - Set build command: `npm run build`
   - Set output directory: `dist`
   - Add environment variables if needed

### Backend (Render)

1. **Create `render.yaml`:**

   ```yaml
   services:
     - type: web
       name: trip-logger-backend
       env: python
       buildCommand: pip install -r requirements.txt && python manage.py migrate
       startCommand: python manage.py runserver
       envVars:
         - key: ORS_API_KEY
           sync: false
   ```

2. **Deploy to Render:**
   - Connect your GitHub repository
   - Set environment variables
   - Deploy automatically

### Docker Deployment

1. **Backend Dockerfile:**

   ```dockerfile
   FROM python:3.11-slim
   WORKDIR /app
   COPY requirements.txt .
   RUN pip install -r requirements.txt
   COPY . .
   CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
   ```

2. **Frontend Dockerfile:**
   ```dockerfile
   FROM node:18-alpine
   WORKDIR /app
   COPY package*.json ./
   RUN npm install
   COPY . .
   RUN npm run build
   CMD ["npm", "run", "preview"]
   ```

## 📊 API Endpoints

### Trips

- `GET /api/trips/` - List all trips
- `POST /api/trips/` - Create new trip
- `GET /api/trips/{id}/` - Get trip details
- `PUT /api/trips/{id}/` - Update trip
- `DELETE /api/trips/{id}/` - Delete trip
- `POST /api/trips/{id}/calculate_route/` - Calculate route

### Daily Logs

- `GET /api/logs/` - List all logs
- `POST /api/logs/` - Create new log
- `GET /api/logs/{id}/` - Get log details
- `PUT /api/logs/{id}/` - Update log
- `DELETE /api/logs/{id}/` - Delete log

### Test

- `GET /api/hello/` - Test endpoint

## 🔒 ELD Compliance

The application enforces federal ELD regulations:

- **11-Hour Rule**: Maximum 11 hours of driving
- **14-Hour Rule**: Maximum 14 hours on duty
- **30-Minute Break**: Required after 8 hours of driving
- **70-Hour Cycle**: Maximum 70 hours in 8 days
- **10-Hour Rest**: Minimum 10 hours off duty

## 🛠️ Troubleshooting

### Common Issues

1. **Redis Connection Error:**

   ```bash
   # Start Redis server
   redis-server
   ```

2. **OpenRouteService API Limit:**

   - Check your API key
   - Verify rate limiting settings
   - Check API quota

3. **CORS Issues:**

   - Ensure `CORS_ALLOW_ALL_ORIGINS = True` in settings
   - Check frontend URL in CORS settings

4. **Database Issues:**
   ```bash
   # Reset database
   rm db.sqlite3
   python manage.py migrate
   ```

### Debug Mode

Enable debug mode in `.env`:

```env
DEBUG=True
```

## 📝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:

- Create an issue on GitHub
- Check the troubleshooting section
- Review the API documentation

## 🔄 Updates

- **v1.0.0**: Initial release with basic trip logging
- **v1.1.0**: Added route calculation and ELD compliance
- **v1.2.0**: Enhanced UI with visualizations and maps
- **v1.3.0**: Added input validation and improved styling

---

**Built with ❤️ for the trucking industry**
