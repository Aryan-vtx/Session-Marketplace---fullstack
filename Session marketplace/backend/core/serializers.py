from rest_framework import serializers
from django.utils import timezone
from core.models import User, Session, Booking


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'email', 'role']
        read_only_fields = ['id', 'email', 'role']


class MockLoginSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)
    role = serializers.ChoiceField(
        choices=User.ROLE_CHOICES,
        default=User.ROLE_USER,
        required=False
    )


class GoogleOAuthSerializer(serializers.Serializer):
    credential = serializers.CharField(required=False, allow_blank=True)
    access_token = serializers.CharField(required=False, allow_blank=True)
    email = serializers.EmailField(required=False, allow_blank=True)
    role = serializers.ChoiceField(
        choices=User.ROLE_CHOICES,
        default=User.ROLE_USER,
        required=False
    )


class GithubOAuthSerializer(serializers.Serializer):
    code = serializers.CharField(required=False, allow_blank=True)
    email = serializers.EmailField(required=False, allow_blank=True)
    role = serializers.ChoiceField(
        choices=User.ROLE_CHOICES,
        default=User.ROLE_USER,
        required=False
    )



class SessionSerializer(serializers.ModelSerializer):
    creator = UserSerializer(read_only=True)
    seats_booked = serializers.IntegerField(read_only=True)
    is_full = serializers.BooleanField(read_only=True)
    is_past = serializers.BooleanField(read_only=True)

    class Meta:
        model = Session
        fields = [
            'id', 'title', 'description', 'creator',
            'capacity', 'seats_booked', 'start_time',
            'created_at', 'is_full', 'is_past'
        ]
        read_only_fields = ['id', 'creator', 'seats_booked', 'created_at', 'is_full', 'is_past']

    def validate_capacity(self, value):
        if value <= 0:
            raise serializers.ValidationError("Capacity must be greater than 0.")
        return value

    def validate_start_time(self, value):
        if value <= timezone.now():
            raise serializers.ValidationError("Session start_time must be in the future.")
        return value


class BookingSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    session = SessionSerializer(read_only=True)

    class Meta:
        model = Booking
        fields = ['id', 'user', 'session', 'status', 'created_at']
        read_only_fields = ['id', 'user', 'session', 'status', 'created_at']
