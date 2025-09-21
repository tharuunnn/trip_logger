from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TripViewSet, DailyLogViewSet, hello

# Create router for ViewSets
router = DefaultRouter()
router.register(r'trips', TripViewSet)
router.register(r'logs', DailyLogViewSet)

urlpatterns = [
    # API endpoints
    path('', include(router.urls)),
    path('hello/', hello, name='hello'),
]
