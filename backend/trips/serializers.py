from rest_framework import serializers
from .models import Trip, DailyLog, LogEntry


class TripSerializer(serializers.ModelSerializer):
    """
    Serializer for Trip model with all CRUD operations.
    """
    calculated_cycle_hours = serializers.SerializerMethodField()
    
    class Meta:
        model = Trip
        fields = ['id', 'driver_name', 'pickup_location', 'dropoff_location', 
                 'start_time', 'status', 'cycle_used_hours', 'calculated_cycle_hours', 'created_at']
        read_only_fields = ['id', 'created_at']
    
    def get_calculated_cycle_hours(self, obj):
        """Get calculated cycle hours from daily logs."""
        return obj.calculate_total_cycle_hours()
    
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
    entries = serializers.SerializerMethodField()
    
    class Meta:
        model = DailyLog
        fields = ['id', 'trip', 'trip_driver_name', 'trip_route', 'day', 'driving_hours', 
                 'off_duty_hours', 'status', 'remarks', 'entries', 'created_at']
        read_only_fields = ['id', 'created_at']
    
    def get_trip_route(self, obj):
        """Get formatted trip route for display."""
        return f"{obj.trip.pickup_location} → {obj.trip.dropoff_location}"

    def get_entries(self, obj):
        entries = obj.entries.all().order_by('created_at')
        return LogEntrySerializer(entries, many=True).data
    
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


class LogEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = LogEntry
        fields = ['id', 'daily_log', 'status', 'start_hour', 'duration_hours', 'remarks', 'created_at']
        read_only_fields = ['id', 'created_at']

    def validate(self, attrs):
        start = attrs.get('start_hour')
        duration = attrs.get('duration_hours')
        if start is not None and (start < 0 or start >= 24):
            raise serializers.ValidationError({"start_hour": "Must be within 0-24."})
        if duration is not None and duration <= 0:
            raise serializers.ValidationError({"duration_hours": "Must be greater than 0."})
        if start is not None and duration is not None:
            if start + duration > 24:
                raise serializers.ValidationError(
                    "Entry crosses midnight. Split it into two entries: one ending at 24:00 for this day, and another starting at 00:00 on the next day."
                )
        return attrs


class TripDetailSerializer(TripSerializer):
    """
    Extended serializer for Trip with related daily logs.
    """
    daily_logs = DailyLogSerializer(many=True, read_only=True)
    
    class Meta(TripSerializer.Meta):
        fields = TripSerializer.Meta.fields + ['daily_logs']
