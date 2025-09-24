import requests
from django.shortcuts import render
from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import api_view, action
from rest_framework.permissions import AllowAny
from django_ratelimit.decorators import ratelimit
from .models import Trip, DailyLog, LogEntry
from .serializers import TripSerializer, TripDetailSerializer, DailyLogSerializer, LogEntrySerializer
from .utils import calculate_trip_route, generate_daily_logs, calculate_eld_compliance, geocode_address, compute_cycle_remaining
from django.utils.decorators import method_decorator
from django.utils import timezone
from rest_framework import serializers
from decimal import Decimal

# the class below is the backend endpoint that receives the requests from the frontend 
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

    @action(detail=True, methods=['delete'])
    def purge_logs(self, request, pk=None):
        """Delete all daily logs and entries for this trip."""
        trip = self.get_object()
        # Delete LogEntry objects via related name to avoid orphans
        for log in trip.daily_logs.all():
            log.entries.all().delete()
        deleted, _ = trip.daily_logs.all().delete()
        return Response({
            "trip_id": trip.id,
            "deleted_logs": deleted
        }, status=status.HTTP_200_OK)
    
 
    #for current location, recieved from the frontend (check the form)
    @method_decorator(ratelimit(key='ip', rate='10/h', method='POST', block=True))
    @action(detail=True, methods=['post'])
    def calculate_route(self, request, pk=None):

        # print(f"[DEBUG - views.py] calculate_route called for trip {pk}, request.data = {request.data}")

        """Calculate route and generate daily logs for a trip with rate limiting."""
        trip = self.get_object()
        
        # Get current location from request - this is the frontend GPS coordinates that we get from the frontend form.py (check the form)
        current_location = request.data.get("current_location")

        if current_location:
            # trust but validate
            try:
                lat = float(current_location.get("lat"))
                lon = float(current_location.get("lon"))
                current = {"lat": lat, "lon": lon, "address": current_location.get("address", "Current Location")}
            except Exception:
                return Response({"error": "Invalid current_location payload"}, status=400)
        else:
            return Response({"error": "current_location is required"}, status=400)
            
        
        pickup_location = geocode_address(trip.pickup_location)
        dropoff_location = geocode_address(trip.dropoff_location)
        
        try:
            # Calculate route using OpenRouteService API
            route = calculate_trip_route(current, pickup_location, dropoff_location)
            
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

    @action(detail=True, methods=['get'])
    def cycle_remaining(self, request, pk=None):
        """Return rolling 70-hour/8-day cycle remaining (with 34-hour reset if detected)."""
        try:
            data = compute_cycle_remaining(int(pk))
            if 'error' in data:
                return Response(data, status=status.HTTP_404_NOT_FOUND)
            return Response(data)
        except Exception as e:
            return Response({
                'error': f'Failed to compute cycle remaining: {e}'
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


class LogEntryViewSet(viewsets.ModelViewSet):
    """CRUD for individual log entries that roll up into a DailyLog."""
    queryset = LogEntry.objects.all()
    serializer_class = LogEntrySerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        qs = LogEntry.objects.all()
        daily_log_id = self.request.query_params.get('daily_log_id')
        trip_id = self.request.query_params.get('trip_id')
        day = self.request.query_params.get('day')
        if daily_log_id:
            qs = qs.filter(daily_log_id=daily_log_id)
        elif trip_id and day:
            try:
                dl = DailyLog.objects.get(trip_id=trip_id, day=day)
                qs = qs.filter(daily_log=dl)
            except DailyLog.DoesNotExist:
                qs = qs.none()
        return qs

    def perform_create(self, serializer):
        daily_log = serializer.validated_data['daily_log']
        today = timezone.localdate()
        if daily_log.day < today:
            raise serializers.ValidationError("Cannot modify a past day's log.")
        instance = serializer.save()
        self._recompute_rollup(daily_log)
        return instance

    def perform_update(self, serializer):
        daily_log = serializer.instance.daily_log
        today = timezone.localdate()
        if daily_log.day < today:
            raise serializers.ValidationError("Cannot modify a past day's log.")
        instance = serializer.save()
        self._recompute_rollup(daily_log)
        return instance

    def perform_destroy(self, instance):
        daily_log = instance.daily_log
        today = timezone.localdate()
        if daily_log.day < today:
            raise serializers.ValidationError("Cannot modify a past day's log.")
        instance.delete()
        self._recompute_rollup(daily_log)

    def _recompute_rollup(self, daily_log: DailyLog):
        entries = daily_log.entries.all()
        drive = Decimal('0')
        off = Decimal('0')
        for e in entries:
            if e.status == 'driving':
                drive += e.duration_hours
            else:
                off += e.duration_hours
        daily_log.driving_hours = drive
        daily_log.off_duty_hours = off
        daily_log.save(update_fields=['driving_hours', 'off_duty_hours'])


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