from django.shortcuts import render
from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import api_view, action
from rest_framework.permissions import AllowAny
from .models import Trip, DailyLog
from .serializers import TripSerializer, TripDetailSerializer, DailyLogSerializer


class TripViewSet(viewsets.ModelViewSet): # model viewset provides all the CRUD operations
    """
    ViewSet for managing trips with full CRUD operations.
    """
    queryset = Trip.objects.all()
    serializer_class = TripSerializer
    permission_classes = [AllowAny]  # For development - add authentication later
    
    def get_serializer_class(self):
        """Use detailed serializer for retrieve operations."""
        if self.action == 'retrieve':
            return TripDetailSerializer
        return TripSerializer
    
    #basically the above is to determing what kind of req is coming in (set by drf) and then return the appropriate serializer, such as it is retrieve then trip detail else for all other crap like update bla bla it's trip serializer.
    
    @action(detail=True, methods=['get'])
    def logs(self, request, pk=None):
        """Get all daily logs for a specific trip."""
        trip = self.get_object()
        logs = trip.daily_logs.all()
        serializer = DailyLogSerializer(logs, many=True)
        return Response(serializer.data)


class DailyLogViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing daily logs with full CRUD operations.
    """
    queryset = DailyLog.objects.all()
    serializer_class = DailyLogSerializer
    permission_classes = [AllowAny]  # For development - add authentication later
    
    def get_queryset(self):
        """Filter logs by trip if trip_id is provided."""
        queryset = DailyLog.objects.all()
        trip_id = self.request.query_params.get('trip_id', None)
        if trip_id:
            queryset = queryset.filter(trip_id=trip_id)
        return queryset


@api_view(['GET'])
def hello(request):
    """
    Dummy endpoint to verify API is working.
    """
    return Response({
        "message": "Hello from Trip Logger API!",
        "status": "API is working correctly",
        "endpoints": {
            "trips": "/api/trips/",
            "logs": "/api/logs/",
            "hello": "/api/hello/"
        }
    })