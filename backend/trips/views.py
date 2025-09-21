from django.shortcuts import render
from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import api_view, action
from rest_framework.permissions import AllowAny
from django_ratelimit.decorators import ratelimit
from .models import Trip, DailyLog
from .serializers import TripSerializer, TripDetailSerializer, DailyLogSerializer
from .utils import calculate_trip_route, generate_daily_logs, calculate_eld_compliance


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
    
    @ratelimit(key='ip', rate='10/h', method='POST', block=True)
    @action(detail=True, methods=['post'])
    def calculate_route(self, request, pk=None):
        """Calculate route and generate daily logs for a trip with rate limiting."""
        trip = self.get_object()
        
        # Get current location from request (in real app, this would come from GPS)
        current_location = request.data.get('current_location', {
            'lat': 40.7128, 'lon': -74.0060, 'address': 'Current Location'
        })
        
        pickup_location = {
            'lat': 41.8781, 'lon': -87.6298, 
            'address': trip.pickup_location
        }
        dropoff_location = {
            'lat': 34.0522, 'lon': -118.2437, 
            'address': trip.dropoff_location
        }
        
        try:
            # Calculate route using OpenRouteService API
            route = calculate_trip_route(current_location, pickup_location, dropoff_location)
            
            # Generate daily logs
            daily_logs = generate_daily_logs(
                trip.start_time, 
                route['total_trip_time'], 
                float(trip.cycle_used_hours),
                trip.driver_name
            )
            
            # Check ELD compliance
            compliance = calculate_eld_compliance(
                route['total_trip_time'], 
                float(trip.cycle_used_hours)
            )
            
            return Response({
                'trip_id': trip.id,
                'route': route,
                'daily_logs': daily_logs,
                'compliance': compliance,
                'cached': not route.get('api_used', True)  # Indicates if result was cached
            })
            
        except Exception as e:
            return Response({
                'error': f'Route calculation failed: {str(e)}',
                'trip_id': trip.id
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


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