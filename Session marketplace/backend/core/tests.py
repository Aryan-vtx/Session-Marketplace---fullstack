from datetime import timedelta
from django.db import connection, transaction
from django.test import TestCase, TransactionTestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from core.models import User, Session, Booking


class BookingTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.creator = User.objects.create_user(email='creator_test@example.com', role=User.ROLE_CREATOR)
        self.user1 = User.objects.create_user(email='user1_test@example.com', role=User.ROLE_USER)
        self.user2 = User.objects.create_user(email='user2_test@example.com', role=User.ROLE_USER)

        self.valid_session = Session.objects.create(
            title='Python Deep Dive',
            description='Advanced Django',
            creator=self.creator,
            capacity=2,
            start_time=timezone.now() + timedelta(days=2)
        )

        self.past_session = Session.objects.create(
            title='Past Workshop',
            description='Expired',
            creator=self.creator,
            capacity=5,
            start_time=timezone.now() - timedelta(days=1)
        )

    def test_book_valid_session_success(self):
        self.client.force_authenticate(user=self.user1)
        book_url = reverse('session-book', kwargs={'pk': self.valid_session.id})

        response = self.client.post(book_url)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        self.valid_session.refresh_from_db()
        self.assertEqual(self.valid_session.seats_booked, 1)

    def test_book_past_session_fails(self):
        self.client.force_authenticate(user=self.user1)
        book_url = reverse('session-book', kwargs={'pk': self.past_session.id})

        response = self.client.post(book_url)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_duplicate_active_booking_fails(self):
        self.client.force_authenticate(user=self.user1)
        book_url = reverse('session-book', kwargs={'pk': self.valid_session.id})

        res1 = self.client.post(book_url)
        self.assertEqual(res1.status_code, status.HTTP_201_CREATED)

        res2 = self.client.post(book_url)
        self.assertEqual(res2.status_code, status.HTTP_400_BAD_REQUEST)
