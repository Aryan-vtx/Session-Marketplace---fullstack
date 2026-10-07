# Debugging Log

---

## Issue 1 — Race Condition in Booking Endpoint (Overselling)

### Symptom

When the booking endpoint was tested with multiple concurrent requests for a session with `capacity=1`, more than one booking succeeded — `seats_booked` was incremented beyond the session's capacity and multiple `Booking` records were created.

### Diagnosis

The booking view read `seats_booked` and checked `seats_booked < capacity` inside a regular (non-atomic) view function. Under concurrent load, multiple threads both passed the capacity check before any had written the incremented value back to the database. This is a classic read-modify-write race condition.

### Root Cause

No row-level lock was held on the `Session` row between reading `seats_booked` and writing the updated value. Database transactions without row locking allow concurrent reads of the same row snapshot, so 5 concurrent requests all read `seats_booked = 0`, all passed the `0 < 1` capacity check, and all created active bookings.

### Fix

Wrapped the read-check-increment-create sequence in `transaction.atomic()` and acquired a row lock using `select_for_update()`:

```python
# backend/core/views.py — BookSessionView.post()
with transaction.atomic():
    session = Session.objects.select_for_update().get(pk=pk)
    # ... capacity check ...
    session.seats_booked += 1
    session.save(update_fields=['seats_booked'])
    booking = Booking.objects.create(...)
```

`select_for_update()` acquires a row-level lock on the `Session` row for the duration of the transaction, serializing concurrent booking attempts for the same session.

### Verification

**Before Fix — Without `select_for_update()` / `transaction.atomic()`:**
```text
==================================================================
      RUNNING CONCURRENCY RACE CONDITION TEST SUITE              
==================================================================
--- SCENARIO 1: Multiple Concurrent Users (Overselling Prevention) ---
  User user_1_57bff0@test.com       -> SUCCESS (201)
  User user_5_57bff0@test.com       -> SUCCESS (201)
  User user_3_57bff0@test.com       -> SUCCESS (201)
  User user_2_57bff0@test.com       -> SUCCESS (201)
  User user_4_57bff0@test.com       -> SUCCESS (201)

AssertionError: Expected 1 successful booking, got 5
```
*(Result: 5 out of 5 concurrent requests succeeded for a 1-seat capacity session, proving the race condition).*

**After Fix — With `transaction.atomic()` + `select_for_update()`:**
```text
==================================================================
      RUNNING CONCURRENCY RACE CONDITION TEST SUITE              
==================================================================
--- SCENARIO 1: Multiple Concurrent Users (Overselling Prevention) ---
  User user_4_b48b36@test.com       -> REJECTED (400): Session is currently busy or fully booked. Please try again.
  User user_3_b48b36@test.com       -> REJECTED (400): Session is currently busy or fully booked. Please try again.
  User user_5_b48b36@test.com       -> REJECTED (400): Session is currently busy or fully booked. Please try again.
  User user_2_b48b36@test.com       -> REJECTED (400): Session is currently busy or fully booked. Please try again.
  User user_1_b48b36@test.com       -> SUCCESS (201)

[RESULT] Capacity: 1 | Successful bookings: 1 | Rejected: 4 | Final seats_booked: 1 -> PASS

--- SCENARIO 2: Single User Concurrent Double-Booking Prevention ---
  Request #5 -> REJECTED (400): Session is currently busy or fully booked. Please try again.
  Request #4 -> REJECTED (400): Session is currently busy or fully booked. Please try again.
  Request #1 -> REJECTED (400): Session is currently busy or fully booked. Please try again.
  Request #2 -> REJECTED (400): Session is currently busy or fully booked. Please try again.
  Request #3 -> SUCCESS (201)

[RESULT] Capacity: 5 | Successful: 1 | Rejected: 4 | Active Bookings in DB: 1 -> PASS

==================================================================
ALL CONCURRENCY TESTS COMPLETED SUCCESSFULLY!
==================================================================
```
*(Result: Exactly 1 request succeeded and 4 were cleanly rejected with 400 Bad Request).*
