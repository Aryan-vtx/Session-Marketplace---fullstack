from django.contrib import admin
from core.models import User, Session, Booking


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ['id', 'email', 'role', 'is_staff', 'is_superuser']
    list_filter = ['role', 'is_staff', 'is_superuser']
    search_fields = ['email']


@admin.register(Session)
class SessionAdmin(admin.ModelAdmin):
    list_display = ['id', 'title', 'creator', 'capacity', 'seats_booked', 'start_time', 'created_at']
    list_filter = ['start_time', 'created_at']
    search_fields = ['title', 'creator__email']


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'session', 'status', 'created_at']
    list_filter = ['status', 'created_at']
    search_fields = ['user__email', 'session__title']
