from django.urls import path, include
from rest_framework.routers import DefaultRouter
from core.views import (
    MockLoginView,
    GoogleOAuthLoginView,
    GithubOAuthLoginView,
    OAuthConfigView,
    SessionViewSet,
    BookSessionView,
    UserBookingsView,
    SessionBookingsView,
)

router = DefaultRouter()
router.register(r'sessions', SessionViewSet, basename='session')

urlpatterns = [
    path('auth/config/', OAuthConfigView.as_view(), name='oauth-config'),
    path('auth/login/', MockLoginView.as_view(), name='mock-login'),
    path('auth/google/', GoogleOAuthLoginView.as_view(), name='google-login'),
    path('auth/github/', GithubOAuthLoginView.as_view(), name='github-login'),
    path('sessions/<int:pk>/book/', BookSessionView.as_view(), name='session-book'),
    path('sessions/<int:pk>/bookings/', SessionBookingsView.as_view(), name='session-bookings'),
    path('bookings/my/', UserBookingsView.as_view(), name='user-bookings'),
    path('', include(router.urls)),
]

