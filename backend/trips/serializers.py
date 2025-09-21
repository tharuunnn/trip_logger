from rest_framework import serializers
from .models import Trip, DailyLog


class TripSerializer(serializers.ModelSerializer):
    """
    Serializer for Trip model with all CRUD operations.
    """
    class Meta:
        model = Trip
        fields = ['id', 'driver_name', 'pickup_location', 'dropoff_location', 
                 'start_time', 'cycle_used_hours', 'created_at']
        read_only_fields = ['id', 'created_at']
    
    def validate_cycle_used_hours(self, value):
        """Validate that cycle hours are positive."""
        if value < 0:
            raise serializers.ValidationError("Cycle hours cannot be negative.")
        return value


class DailyLogSerializer(serializers.ModelSerializer):
    """
    Serializer for DailyLog model with all CRUD operations.
    """
    trip_driver_name = serializers.CharField(source='trip.driver_name', read_only=True)
    trip_route = serializers.SerializerMethodField()
    
    class Meta:
        model = DailyLog
        fields = ['id', 'trip', 'trip_driver_name', 'trip_route', 'day', 'driving_hours', 
                 'off_duty_hours', 'status', 'remarks', 'created_at']
        read_only_fields = ['id', 'created_at']
    
    def get_trip_route(self, obj):
        """Get formatted trip route for display."""
        return f"{obj.trip.pickup_location} → {obj.trip.dropoff_location}"
    
    def validate_driving_hours(self, value):
        """Validate driving hours are within legal limits."""
        if value < 0:
            raise serializers.ValidationError("Driving hours cannot be negative.")
        if value > 11:  # Federal limit is 11 hours
            raise serializers.ValidationError("Driving hours cannot exceed 11 hours per day.")
        return value
    
    def validate_off_duty_hours(self, value):
        """Validate off-duty hours are positive."""
        if value < 0:
            raise serializers.ValidationError("Off-duty hours cannot be negative.")
        return value


class TripDetailSerializer(TripSerializer):
    """
    Extended serializer for Trip with related daily logs.
    """
    daily_logs = DailyLogSerializer(many=True, read_only=True)
    
    class Meta(TripSerializer.Meta):
        fields = TripSerializer.Meta.fields + ['daily_logs']
