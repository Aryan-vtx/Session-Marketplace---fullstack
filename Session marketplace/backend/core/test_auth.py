from datetime import timedelta
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import AccessToken

from core.models import User, Session


class AuthAndPermissionsTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()

        self.user = User.objects.create_user(
            email='regular_user@example.com',
            role=User.ROLE_USER
        )

        self.creator_a = User.objects.create_user(
            email='creator_a@example.com',
            role=User.ROLE_CREATOR
        )
        self.creator_b = User.objects.create_user(
            email='creator_b@example.com',
            role=User.ROLE_CREATOR
        )

        login_url = reverse('mock-login')
        
        user_login_res = self.client.post(login_url, {'email': self.user.email, 'role': 'user'})
        self.user_token = user_login_res.data['access']

        creator_a_login_res = self.client.post(login_url, {'email': self.creator_a.email, 'role': 'creator'})
        self.creator_a_token = creator_a_login_res.data['access']

        creator_b_login_res = self.client.post(login_url, {'email': self.creator_b.email, 'role': 'creator'})
        self.creator_b_token = creator_b_login_res.data['access']

        self.session_b = Session.objects.create(
            title="Creator B's Private Session",
            description="Exclusive workshop",
            creator=self.creator_b,
            capacity=5,
            seats_booked=0,
            start_time=timezone.now() + timedelta(days=2)
        )

    def test_01_user_cannot_create_session(self):
        url = reverse('session-list')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.user_token}')

        session_data = {
            'title': 'Unauthorized Session',
            'description': 'Regular user trying to create session',
            'capacity': 10,
            'start_time': (timezone.now() + timedelta(days=1)).isoformat()
        }

        response = self.client.post(url, session_data)

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
            f"Expected 403 Forbidden when role='user' tries to create session, got {response.status_code}"
        )
        self.assertEqual(
            Session.objects.filter(title='Unauthorized Session').count(),
            0,
            "Session should not be saved in database when request is forbidden."
        )

    def test_02_creator_a_cannot_modify_or_delete_creator_b_session(self):
        url = reverse('session-detail', kwargs={'pk': self.session_b.id})
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.creator_a_token}')

        patch_response = self.client.patch(url, {'title': "Hacked Session Title"})
        self.assertEqual(
            patch_response.status_code,
            status.HTTP_403_FORBIDDEN,
            f"Expected 403 Forbidden when non-owner creator attempts PATCH, got {patch_response.status_code}"
        )

        delete_response = self.client.delete(url)
        self.assertEqual(
            delete_response.status_code,
            status.HTTP_403_FORBIDDEN,
            f"Expected 403 Forbidden when non-owner creator attempts DELETE, got {delete_response.status_code}"
        )

        self.session_b.refresh_from_db()
        self.assertEqual(
            self.session_b.title,
            "Creator B's Private Session",
            "Session title in database must remain unchanged after forbidden attempt."
        )

    def test_03_invalid_or_expired_token_returns_401(self):
        url = reverse('user-bookings')

        self.client.credentials(HTTP_AUTHORIZATION='Bearer malformed_invalid_jwt_token_123')
        response_malformed = self.client.get(url)

        self.assertEqual(
            response_malformed.status_code,
            status.HTTP_401_UNAUTHORIZED,
            f"Expected 401 Unauthorized for malformed JWT token, got {response_malformed.status_code}"
        )

        expired_token = AccessToken.for_user(self.user)
        expired_token.set_exp(lifetime=-timedelta(hours=1))
        
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {str(expired_token)}')
        response_expired = self.client.get(url)

        self.assertEqual(
            response_expired.status_code,
            status.HTTP_401_UNAUTHORIZED,
            f"Expected 401 Unauthorized for expired JWT token, got {response_expired.status_code}"
        )

    def test_04_missing_authorization_header_returns_401(self):
        url = reverse('user-bookings')
        self.client.credentials()

        response = self.client.get(url)

        self.assertEqual(
            response.status_code,
            status.HTTP_401_UNAUTHORIZED,
            f"Expected 401 Unauthorized when no Authorization header is sent, got {response.status_code}"
        )

    def test_05_non_owner_cannot_view_session_bookings(self):
        url = reverse('session-bookings', kwargs={'pk': self.session_b.id})

        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.user_token}')
        response_user = self.client.get(url)
        self.assertEqual(
            response_user.status_code,
            status.HTTP_403_FORBIDDEN,
            f"Expected 403 Forbidden when regular user requests attendee list, got {response_user.status_code}"
        )

        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.creator_a_token}')
        response_creator_a = self.client.get(url)
        self.assertEqual(
            response_creator_a.status_code,
            status.HTTP_403_FORBIDDEN,
            f"Expected 403 Forbidden when non-owner creator requests attendee list, got {response_creator_a.status_code}"
        )

        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.creator_b_token}')
        response_creator_b = self.client.get(url)
        self.assertEqual(
            response_creator_b.status_code,
            status.HTTP_200_OK,
            f"Expected 200 OK when session owner creator requests attendee list, got {response_creator_b.status_code}"
        )

    def test_06_oauth_config_returns_client_ids(self):
        url = reverse('oauth-config')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('google_client_id', response.data)
        self.assertIn('github_client_id', response.data)

    def test_07_google_oauth_login_issues_jwt(self):
        url = reverse('google-login')
        response = self.client.post(url, {'email': 'google_test@example.com', 'role': 'user'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertEqual(response.data['user']['email'], 'google_test@example.com')

    def test_08_github_oauth_login_issues_jwt(self):
        url = reverse('github-login')
        response = self.client.post(url, {'email': 'github_test@example.com', 'role': 'creator'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertEqual(response.data['user']['email'], 'github_test@example.com')
        self.assertEqual(response.data['user']['role'], 'creator')

