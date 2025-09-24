from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TripViewSet, DailyLogViewSet, LogEntryViewSet, hello

# Create router for ViewSets, this is the url that the frontend will use to send requests to the backend
router = DefaultRouter()
router.register(r'trips', TripViewSet)
router.register(r'logs', DailyLogViewSet)
router.register(r'entries', LogEntryViewSet)

# In drf when we make a endpoint like api/trips the usual pattern is:
#  > url.py uses a router register 
#  > all requests to api/trips are send to the TripViewSet class in views.py


urlpatterns = [
    # API endpoints
    path('', include(router.urls)),
    path('hello/', hello, name='hello'),
]
