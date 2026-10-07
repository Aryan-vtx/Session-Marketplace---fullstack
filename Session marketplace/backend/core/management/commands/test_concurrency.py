import uuid
from datetime import timedelta
from concurrent.futures import ThreadPoolExecutor, as_completed
from django.core.management.base import BaseCommand
from django.db import connection
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from core.models import User, Session, Booking


class Command(BaseCommand):
    help = 'Reproduces race conditions to prove atomic select_for_update() booking endpoint cannot oversell seats.'

    def handle(self, *args, **options):
        if connection.vendor == 'sqlite':
            with connection.cursor() as cursor:
                cursor.execute("PRAGMA journal_mode=WAL;")
                cursor.execute("PRAGMA busy_timeout=10000;")

        self.stdout.write(self.style.MIGRATE_HEADING("=================================================================="))
        self.stdout.write(self.style.MIGRATE_HEADING("      RUNNING CONCURRENCY RACE CONDITION TEST SUITE              "))
        self.stdout.write(self.style.MIGRATE_HEADING("==================================================================\n"))

        self.run_scenario_1_oversell_prevention()
        self.stdout.write("")
        self.run_scenario_2_double_booking_prevention()

        self.stdout.write(self.style.MIGRATE_HEADING("\n=================================================================="))
        self.stdout.write(self.style.SUCCESS("ALL CONCURRENCY TESTS COMPLETED SUCCESSFULLY!"))
        self.stdout.write(self.style.MIGRATE_HEADING("=================================================================="))

    def run_scenario_1_oversell_prevention(self):
        self.stdout.write(self.style.WARNING("--- SCENARIO 1: Multiple Concurrent Users (Overselling Prevention) ---"))
        
        run_id = uuid.uuid4().hex[:6]
        creator = User.objects.create_user(email=f'creator_s1_{run_id}@test.com', role=User.ROLE_CREATOR)
        session = Session.objects.create(
            title=f'High Demand Session {run_id}',
            description='Only 1 seat available!',
            creator=creator,
            capacity=1,
            seats_booked=0,
            start_time=timezone.now() + timedelta(days=1)
        )

        users = [
            User.objects.create_user(email=f'user_{i}_{run_id}@test.com', role=User.ROLE_USER)
            for i in range(1, 6)
        ]

        book_url = reverse('session-book', kwargs={'pk': session.id})

        def send_booking_request(user):
            client = APIClient()
            client.force_authenticate(user=user)
            res = client.post(book_url)
            connection.close()
            return user.email, res.status_code, res.data

        results = []
        with ThreadPoolExecutor(max_workers=5) as executor:
            futures = [executor.submit(send_booking_request, user) for user in users]
            for future in as_completed(futures):
                results.append(future.result())

        successful = [r for r in results if r[1] == status.HTTP_201_CREATED]
        rejected = [r for r in results if r[1] == status.HTTP_400_BAD_REQUEST]

        for email, code, body in results:
            outcome = "SUCCESS (201)" if code == 201 else f"REJECTED ({code}): {body.get('detail')}"
            self.stdout.write(f"  User {email:28} -> {outcome}")

        session.refresh_from_db()
        active_bookings = Booking.objects.filter(session=session, status='active').count()

        assert len(successful) == 1, f"Expected 1 successful booking, got {len(successful)}"
        assert len(rejected) == 4, f"Expected 4 rejected bookings, got {len(rejected)}"
        assert session.seats_booked == 1, f"Expected seats_booked=1, got {session.seats_booked}"
        assert active_bookings == 1, f"Expected 1 active booking in DB, got {active_bookings}"

        summary = f"Capacity: {session.capacity} | Successful bookings: {len(successful)} | Rejected: {len(rejected)} | Final seats_booked: {session.seats_booked} -> PASS"
        self.stdout.write(self.style.SUCCESS(f"\n[RESULT] {summary}"))

    def run_scenario_2_double_booking_prevention(self):
        self.stdout.write(self.style.WARNING("--- SCENARIO 2: Single User Concurrent Double-Booking Prevention ---"))
        
        run_id = uuid.uuid4().hex[:6]
        creator = User.objects.create_user(email=f'creator_s2_{run_id}@test.com', role=User.ROLE_CREATOR)
        session = Session.objects.create(
            title=f'Popular Workshop {run_id}',
            description='Multiple seats available',
            creator=creator,
            capacity=5,
            seats_booked=0,
            start_time=timezone.now() + timedelta(days=2)
        )

        user = User.objects.create_user(email=f'eager_user_{run_id}@test.com', role=User.ROLE_USER)
        book_url = reverse('session-book', kwargs={'pk': session.id})

        def send_booking_request(req_id):
            client = APIClient()
            client.force_authenticate(user=user)
            res = client.post(book_url)
            connection.close()
            return req_id, res.status_code, res.data

        results = []
        with ThreadPoolExecutor(max_workers=5) as executor:
            futures = [executor.submit(send_booking_request, i) for i in range(1, 6)]
            for future in as_completed(futures):
                results.append(future.result())

        successful = [r for r in results if r[1] == status.HTTP_201_CREATED]
        rejected = [r for r in results if r[1] == status.HTTP_400_BAD_REQUEST]

        for req_id, code, body in results:
            outcome = "SUCCESS (201)" if code == 201 else f"REJECTED ({code}): {body.get('detail')}"
            self.stdout.write(f"  Request #{req_id} -> {outcome}")

        session.refresh_from_db()
        user_active_bookings = Booking.objects.filter(user=user, session=session, status='active').count()

        assert len(successful) == 1, f"Expected 1 successful booking, got {len(successful)}"
        assert len(rejected) == 4, f"Expected 4 rejected requests, got {len(rejected)}"
        assert user_active_bookings == 1, f"Expected 1 active booking in DB, got {user_active_bookings}"

        summary = f"Capacity: {session.capacity} | Successful: {len(successful)} | Rejected: {len(rejected)} | Active Bookings in DB: {user_active_bookings} -> PASS"
        self.stdout.write(self.style.SUCCESS(f"\n[RESULT] {summary}"))
