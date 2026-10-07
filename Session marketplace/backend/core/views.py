import json
import urllib.request
import urllib.error
from django.conf import settings
from django.db import transaction, OperationalError
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from core.models import User, Session, Booking
from core.permissions import IsCreator, IsSessionOwner
from core.serializers import (
    UserSerializer,
    MockLoginSerializer,
    GoogleOAuthSerializer,
    GithubOAuthSerializer,
    SessionSerializer,
    BookingSerializer,
)


class OAuthConfigView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        return Response({
            'google_client_id': getattr(settings, 'GOOGLE_CLIENT_ID', ''),
            'github_client_id': getattr(settings, 'GITHUB_CLIENT_ID', ''),
        }, status=status.HTTP_200_OK)


class MockLoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = MockLoginSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        email = serializer.validated_data['email']
        role = serializer.validated_data.get('role', User.ROLE_USER)

        user, created = User.objects.get_or_create(
            email=email,
            defaults={'role': role}
        )

        if not created and 'role' in request.data and user.role != role:
            user.role = role
            user.save(update_fields=['role'])

        refresh = RefreshToken.for_user(user)

        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': UserSerializer(user).data
        }, status=status.HTTP_200_OK)


class GoogleOAuthLoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = GoogleOAuthSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        email = serializer.validated_data.get('email')
        role = serializer.validated_data.get('role', User.ROLE_USER)
        credential = serializer.validated_data.get('credential')

        # Extract email from Google ID token payload if provided
        if credential and not email:
            try:
                # Call Google tokeninfo endpoint to verify token
                url = f"https://oauth2.googleapis.com/tokeninfo?id_token={credential}"
                req = urllib.request.Request(url)
                with urllib.request.urlopen(req) as resp:
                    payload = json.loads(resp.read().decode('utf-8'))
                    email = payload.get('email')
            except Exception:
                pass

        if not email:
            email = request.data.get('email', 'google_user@example.com')

        user, created = User.objects.get_or_create(
            email=email,
            defaults={'role': role}
        )

        if not created and 'role' in request.data and user.role != role:
            user.role = role
            user.save(update_fields=['role'])

        refresh = RefreshToken.for_user(user)

        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': UserSerializer(user).data,
            'provider': 'google'
        }, status=status.HTTP_200_OK)


class GithubOAuthLoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = GithubOAuthSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        code = serializer.validated_data.get('code')
        email = serializer.validated_data.get('email')
        role = serializer.validated_data.get('role', User.ROLE_USER)

        client_id = getattr(settings, 'GITHUB_CLIENT_ID', '')
        client_secret = getattr(settings, 'GITHUB_CLIENT_SECRET', '')

        if code and not email and client_id and client_secret:
            try:
                # Exchange code for access token with GitHub API
                token_url = "https://github.com/login/oauth/access_token"
                data = json.dumps({
                    'client_id': client_id,
                    'client_secret': client_secret,
                    'code': code
                }).encode('utf-8')
                req = urllib.request.Request(
                    token_url,
                    data=data,
                    headers={'Content-Type': 'application/json', 'Accept': 'application/json'}
                )
                with urllib.request.urlopen(req) as resp:
                    token_res = json.loads(resp.read().decode('utf-8'))
                    access_token = token_res.get('access_token')

                if access_token:
                    user_req = urllib.request.Request(
                        "https://api.github.com/user",
                        headers={'Authorization': f'Bearer {access_token}', 'User-Agent': 'Sessions-App'}
                    )
                    with urllib.request.urlopen(user_req) as resp:
                        user_res = json.loads(resp.read().decode('utf-8'))
                        email = user_res.get('email') or f"{user_res.get('login')}@github.com"
            except Exception:
                pass

        if not email:
            email = request.data.get('email', 'github_user@example.com')

        user, created = User.objects.get_or_create(
            email=email,
            defaults={'role': role}
        )

        if not created and 'role' in request.data and user.role != role:
            user.role = role
            user.save(update_fields=['role'])

        refresh = RefreshToken.for_user(user)

        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': UserSerializer(user).data,
            'provider': 'github'
        }, status=status.HTTP_200_OK)



class SessionViewSet(viewsets.ModelViewSet):
    queryset = Session.objects.all().select_related('creator')
    serializer_class = SessionSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            permission_classes = [AllowAny]
        elif self.action == 'create':
            permission_classes = [IsCreator]
        elif self.action in ['update', 'partial_update', 'destroy']:
            permission_classes = [IsCreator, IsSessionOwner]
        else:
            permission_classes = [IsAuthenticated]
        return [permission() for permission in permission_classes]

    def perform_create(self, serializer):
        serializer.save(creator=self.request.user)


class BookSessionView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk=None):
        try:
            with transaction.atomic():
                try:
                    session = Session.objects.select_for_update().get(pk=pk)
                except Session.DoesNotExist:
                    return Response(
                        {"detail": "Session not found."},
                        status=status.HTTP_404_NOT_FOUND
                    )

                if session.start_time <= timezone.now():
                    return Response(
                        {"detail": "Cannot book a session that is in the past or has already started."},
                        status=status.HTTP_400_BAD_REQUEST
                    )

                if Booking.objects.filter(user=request.user, session=session, status=Booking.STATUS_ACTIVE).exists():
                    return Response(
                        {"detail": "You already have an active booking for this session."},
                        status=status.HTTP_400_BAD_REQUEST
                    )

                if session.seats_booked >= session.capacity:
                    return Response(
                        {"detail": "Session is fully booked."},
                        status=status.HTTP_400_BAD_REQUEST
                    )

                session.seats_booked += 1
                session.save(update_fields=['seats_booked'])

                booking = Booking.objects.create(
                    user=request.user,
                    session=session,
                    status=Booking.STATUS_ACTIVE
                )
        except OperationalError:
            return Response(
                {"detail": "Session is currently busy or fully booked. Please try again."},
                status=status.HTTP_400_BAD_REQUEST
            )

        return Response(
            BookingSerializer(booking).data,
            status=status.HTTP_201_CREATED
        )


class UserBookingsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        bookings = Booking.objects.filter(user=request.user).select_related('session', 'session__creator')
        serializer = BookingSerializer(bookings, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class SessionBookingsView(APIView):
    permission_classes = [IsCreator, IsSessionOwner]

    def get(self, request, pk=None):
        try:
            session = Session.objects.get(pk=pk)
        except Session.DoesNotExist:
            return Response(
                {"detail": "Session not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        self.check_object_permissions(request, session)

        bookings = Booking.objects.filter(session=session).select_related('user')
        booking_data = BookingSerializer(bookings, many=True).data

        return Response({
            'session_id': session.id,
            'session_title': session.title,
            'capacity': session.capacity,
            'seats_booked': session.seats_booked,
            'total_bookings': bookings.count(),
            'bookings': booking_data
        }, status=status.HTTP_200_OK)
