web: cd backend && python manage.py migrate && python manage.py collectstatic --noinput && gunicorn core.wsgi --host=0.0.0.0 --port=$PORT
