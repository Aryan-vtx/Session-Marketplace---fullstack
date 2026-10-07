# AI Tool Prompt Log

**Tool used:** Antigravity (AI coding assistant)

---

## Prompt 1 — Backend Models, Auth, and API

**Prompt summary:**
Build a Django + DRF + PostgreSQL backend for a Sessions Marketplace. Models: `User` (extending `AbstractUser`, with a `role` field: "user"/"creator"), `Session` (title, description, creator FK, capacity, seats_booked, start_time, created_at), `Booking` (user FK, session FK, status: active/cancelled, unique-active-per-user-session constraint). Auth: mock login endpoint `POST /api/auth/login/` accepting `{email, role}`, returning JWT access + refresh tokens. Endpoints: session CRUD, `POST /api/sessions/{id}/book/`, `GET /api/bookings/my/`, `GET /api/sessions/{id}/bookings/` (creator-only). Permission classes `IsCreator` and `IsSessionOwner`.

**What was generated:**
- `backend/core/models.py` — User, Session, Booking models with UniqueConstraint
- `backend/core/serializers.py` — ModelSerializers for all three models
- `backend/core/views.py` — MockLoginView, SessionViewSet, BookSessionView, UserBookingsView, SessionBookingsView
- `backend/core/permissions.py` — IsCreator, IsSessionOwner
- `backend/core/urls.py` — URL routing
- `backend/sessions_marketplace/settings.py` — Django settings with JWT config
- `backend/requirements.txt`

**What I changed / rejected:**
- Created missing `backend/sessions_marketplace/wsgi.py` and `asgi.py` which were required by Django's `runserver` WSGI handler.
- Fixed `DB_NAME` in `settings.py` to ensure it always returns a `str` path rather than a `Path` object when fallback SQLite is used.

**How I verified it:**
Ran `python manage.py migrate` and confirmed schema creation. Started dev server and verified API endpoints using HTTP requests.

---

## Prompt 2 — Concurrency Test Script

**Prompt summary:**
Write a Django management command (or standalone script) that proves the booking endpoint cannot oversell seats. Use `threading` or `concurrent.futures.ThreadPoolExecutor`. Create a 1-seat session, fire 5 simultaneous booking requests from 5 different users, assert exactly 1 succeeds and 4 are rejected. Use `TransactionTestCase` or equivalent so real concurrent database behavior is tested. Include a second scenario: single user fires 5 concurrent requests for the same session (double-booking prevention).

**What was generated:**
- `backend/core/management/commands/test_concurrency.py` — Django management command with two scenarios
- `backend/test_concurrency.py` — Standalone execution wrapper

**What I changed / rejected:**
- Added SQLite WAL mode (`PRAGMA journal_mode=WAL;`) and busy timeout configuration to ensure concurrent connection handling when testing against local SQLite.

**How I verified it:**
Ran `python manage.py test_concurrency` from `backend/`. Verified both oversell prevention and double-booking prevention scenarios reported PASS.

---

## Prompt 3 — Authorization and Error Handling Tests

**Prompt summary:**
Write DRF `TestCase` tests (using `APIClient`) covering: (1) a regular user POSTing to `/api/sessions/` gets 403 and no session is created in the DB, (2) Creator A patching/deleting Creator B's session gets 403 and DB is unchanged, (3) an expired or malformed JWT on a protected endpoint returns 401, (4) missing Authorization header returns 401, (5) non-owner viewing `/api/sessions/{id}/bookings/` gets 403, session owner gets 200.

**What was generated:**
- `backend/core/test_auth.py` — 5 test methods in `AuthAndPermissionsTestCase`

**What I changed / rejected:**
- Added `has_permission` method to `IsSessionOwner` in `core/permissions.py` so view-level permission checks work seamlessly when combined with `IsCreator` on APIViews.

**How I verified it:**
Ran `python manage.py test core.test_auth`. All 5 tests passed cleanly in 0.12s.

---

## Prompt 4 — React Frontend

**Prompt summary:**
Build a React (Vite, no TypeScript) frontend with plain CSS only. Pages: (1) Login — email + role dropdown, calls `/api/auth/login/`, stores token in React context. (2) Session list — public, shows all sessions with status badges, Book Seat button for logged-in users. (3) Session detail — full info, Book Seat or login prompt. (4) My Bookings — authenticated, lists user's bookings. (5) Creator Dashboard — create session form, list of owned sessions with attendee counts, edit and delete controls. All protected API calls use `Authorization: Bearer <token>` header.

**What was generated:**
- `frontend/src/AuthContext.jsx`
- `frontend/src/api.js`
- `frontend/src/App.jsx`
- `frontend/src/pages/LoginPage.jsx`
- `frontend/src/pages/SessionListPage.jsx`
- `frontend/src/pages/SessionDetailPage.jsx`
- `frontend/src/pages/MyBookingsPage.jsx`
- `frontend/src/pages/CreatorDashboardPage.jsx`
- `frontend/src/App.css`
- `frontend/index.html`, `vite.config.js`, `package.json`

**What I changed / rejected:**
- Fixed `start_time` input handling in `CreatorDashboardPage.jsx`: replaced `new Date(startTime).toISOString()` with passing the raw `datetime-local` input string directly, resolving a cross-browser `Invalid time value` parsing error.

**How I verified it:**
Started `npm run dev`, logged in as Creator, published a session, logged in as User, booked a seat, and verified booking on My Bookings page.

---

## Prompt 5 — Docker Compose

**Prompt summary:**
Create a `docker-compose.yml` with three services: `db` (postgres:16, named volume for persistence), `backend` (Django, auto-runs migrations on startup, dev server on port 8000, depends on db with healthcheck), `frontend` (Vite dev server on port 5173). Provide `backend/Dockerfile`, `frontend/Dockerfile`, `backend/entrypoint.sh`, and `.env.example` with all required environment variables documented.

**What was generated:**
- `docker-compose.yml`
- `backend/Dockerfile`
- `backend/entrypoint.sh`
- `frontend/Dockerfile`
- `.env.example`
- `.env`

**What I changed / rejected:**
- Added `CORS_ALLOWED_ORIGINS` environment variable configuration in `settings.py` and `docker-compose.yml` to ensure cross-origin browser requests between frontend and backend work reliably.

**How I verified it:**
Verified service definitions, environment variables, healthchecks, entrypoint script permissions, and backend/frontend port mappings.

---

## What AI Got Wrong / What I Corrected

- **Missing WSGI/ASGI configuration:** The initial project scaffolding did not generate `wsgi.py` or `asgi.py` in `sessions_marketplace/`, causing `runserver` to crash with `ImproperlyConfigured: WSGI application could not be loaded`. Added both modules manually.
- **Frontend datetime parsing error:** The AI generated `new Date(startTime).toISOString()` in `CreatorDashboardPage.jsx` for formatting HTML5 `datetime-local` input values. Because `datetime-local` strings lack seconds or timezone designators (`YYYY-MM-DDTHH:mm`), `new Date()` failed with `Invalid time value` in standard browser environments. Fixed by passing the string directly.
