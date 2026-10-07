# Design Decisions

---

## Decision 1 — Mocked Login Endpoint Instead of Real OAuth

| Field | Detail |
|---|---|
| **Problem / Ambiguity** | The spec called for user authentication. Real OAuth (Google/GitHub) requires registering a provider application, configuring redirect URIs, handling callback flows, and storing provider tokens — none of which is feasible to set up correctly in a single session. |
| **Options Considered** | (a) Real Google OAuth via `python-social-auth` or `allauth` — correct for production but requires provider console setup and callback infrastructure. (b) Mock login endpoint that accepts `{email, role}` and issues a real JWT — no external dependency, JWT issuance/validation logic is identical downstream. |
| **Choice Made** | Mock login endpoint: `POST /api/auth/login/` accepts `{email, role}`, creates or fetches the user, and returns `access` + `refresh` tokens via `djangorestframework-simplejwt`. |
| **Trade-off** | The auth flow is less realistic (no password, no provider redirect). The JWT issuance, refresh, and protected-endpoint validation logic is unchanged and would plug into a real OAuth provider later by replacing only the login view. |

---

## Decision 2 — Pessimistic Locking (`select_for_update`) for Booking

| Field | Detail |
|---|---|
| **Problem / Ambiguity** | Two concurrent users booking the last seat in a session must not both succeed. The naive read-then-write pattern has a race condition: both threads read `seats_booked < capacity` before either writes, then both increment. |
| **Options Considered** | (a) Optimistic locking — add a `version` integer field to `Session`, increment on each save, reject saves where version has changed (requires retry logic). (b) Pessimistic locking — `select_for_update()` inside `transaction.atomic()` acquires a row-level lock on the `Session` row before reading, blocking concurrent transactions until the lock is released. |
| **Choice Made** | Pessimistic locking with `select_for_update()`. Simpler to reason about and verify correctness in a constrained scope. The lock is held only for the duration of the read-check-increment-create cycle, which is fast. |
| **Trade-off** | Holds a database row lock briefly under contention, which can reduce throughput if many users book simultaneously at high scale. Optimistic locking would be preferable at high concurrency. For expected booking volumes (event-sized, not e-commerce flash-sale), this is an acceptable trade-off. |

---

## Decision 3 — No Nginx Reverse Proxy

| Field | Detail |
|---|---|
| **Problem / Ambiguity** | A production deployment would route all traffic through a single entry point (Nginx), with Nginx proxying `/api/` to Django and serving the frontend build statically. Setting this up correctly in Docker Compose adds Nginx config files, build steps, and routing rules. |
| **Options Considered** | (a) Add Nginx as a fourth Docker service, serve the React production build through it, proxy API calls. (b) Run frontend and backend as separate Docker services on separate ports, let the browser call each directly. |
| **Choice Made** | Separate services on separate ports: backend on `8000`, frontend on `5173`. Eliminates Nginx config and the need to build the frontend before it can be served. |
| **Trade-off** | No single entry point. Cross-origin requests are handled by `django-cors-headers` with `CORS_ALLOW_ALL_ORIGINS = True` (acceptable only for development). Not production-ready routing. Noted as a known limitation. |

---

## Decision 4 — Minimal Plain CSS Frontend, No Component Library

| Field | Detail |
|---|---|
| **Problem / Ambiguity** | The assignment brief states visual polish is secondary to correctness. Using a component library (e.g. Material UI, Chakra) introduces a dependency, a learning curve for unfamiliar APIs, and potential conflicts. |
| **Options Considered** | (a) Component library (Material UI, Chakra UI, shadcn) — faster to produce polished UI, but adds bundle size and opinionated structure. (b) Plain CSS with hand-written styles — full control, no external dependency, directly meets the brief. |
| **Choice Made** | Plain CSS (`App.css`) with a small set of utility classes (`.btn`, `.card`, `.alert`, `.form-group`, etc.). |
| **Trade-off** | The UI is functional but not visually polished. Meets the brief's stated priority of correctness over polish. A component library would be appropriate if visual quality were a graded criterion. |
