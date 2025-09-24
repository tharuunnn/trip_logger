from django.contrib import admin
from .models import Trip, DailyLog, LogEntry

admin.site.register(Trip)
admin.site.register(DailyLog)
admin.site.register(LogEntry)
