from django.db import models
from django.utils import timezone


class Trip(models.Model):
    """
    Model representing a trucking trip with pickup and dropoff locations.
    """
    driver_name = models.CharField(max_length=100)
    pickup_location = models.CharField(max_length=200)
    dropoff_location = models.CharField(max_length=200)
    start_time = models.DateTimeField()
    cycle_used_hours = models.DecimalField(max_digits=5, decimal_places=2, help_text="Hours used in current cycle")
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Trip {self.id}: {self.pickup_location} → {self.dropoff_location}"


class DailyLog(models.Model):
    """
    Model representing daily ELD (Electronic Logging Device) logs for compliance.
    """
    STATUS_CHOICES = [
        ('off_duty', 'Off Duty'),
        ('sleeper_berth', 'Sleeper Berth'),
        ('driving', 'Driving'),
        ('on_duty_not_driving', 'On Duty Not Driving'),
    ]
    
    trip = models.ForeignKey(Trip, on_delete=models.CASCADE, related_name='daily_logs')
    day = models.DateField()
    driving_hours = models.DecimalField(max_digits=4, decimal_places=2, default=0)
    off_duty_hours = models.DecimalField(max_digits=4, decimal_places=2, default=0)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='off_duty')
    remarks = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-day', '-created_at']
        unique_together = ['trip', 'day']
    
    def __str__(self):
        return f"Log {self.id}: {self.day} - {self.get_status_display()}"


class LogEntry(models.Model):
    """
    Model representing an individual activity entry within a daily log.
    Allows multiple additions to roll up into the same DailyLog.
    """
    STATUS_CHOICES = DailyLog.STATUS_CHOICES

    daily_log = models.ForeignKey(DailyLog, on_delete=models.CASCADE, related_name='entries')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES)
    # Start time within the day in hours (e.g., 13.5 = 1:30 PM)
    start_hour = models.DecimalField(max_digits=4, decimal_places=2, default=0)
    duration_hours = models.DecimalField(max_digits=4, decimal_places=2, default=0)
    remarks = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"Entry {self.id}: {self.status} {self.duration_hours}h"