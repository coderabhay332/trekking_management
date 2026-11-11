# API Endpoints - Trekking Management Application V2

Base URL: `http://localhost:5000`. All bodies and responses are JSON unless stated otherwise.

Authentication: JWT bearer token returned by `POST /api/auth/login`, sent as `Authorization: Bearer <token>`.
Every protected endpoint re-checks the user in the database, so a deactivated or blacklisted account is rejected immediately (403).

Errors use the shape `{"error": "message"}` with status 400 (validation), 401 (not authenticated), 403 (not allowed), 404 (not found), 409 (conflict), 503 (worker unavailable).

Roles: **Public** (no token), **Any** (any logged-in role), **Admin**, **Staff**, **Trekker**.

## Authentication

| Method | Endpoint | Role | Description |
|---|---|---|---|
| POST | `/api/auth/register` | Public | Trekker self-registration. Body: `name`, `email`, `password` (min 6), optional `phone`, `address`. 409 if email exists. |
| POST | `/api/auth/login` | Public | Login for all roles. Body: `email`, `password`. Returns `token` and `user`. 403 for blacklisted or deactivated accounts. |
| GET | `/api/auth/me` | Any | Current user profile. |
| PUT | `/api/auth/profile` | Any | Update `name`, `phone`, `address`, optional new `password`. |

## Admin

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/admin/dashboard` | Totals: treks, trekkers, staff, bookings, active bookings, treks by status. |
| GET | `/api/admin/treks` | List treks. Query: `q` (name, location or ID), `status`. |
| POST | `/api/admin/treks` | Create trek (starts as Pending). Body: `name`, `location`, `difficulty` (Easy/Moderate/Hard), `total_slots`, `start_date`, `end_date`, optional `duration_days`, `price`, `description`, `instructions`. |
| PUT | `/api/admin/treks/<trek_id>` | Update trek fields and `status`. Slots cannot drop below existing bookings; a Completed trek cannot change status; Open/Ongoing/Completed need an assigned staff member. |
| DELETE | `/api/admin/treks/<trek_id>` | Remove trek. 409 if it has active bookings or trekking history. |
| PUT | `/api/admin/treks/<trek_id>/assign` | Assign staff. Body: `staff_id` (null to unassign). A Pending trek becomes Approved on assignment. |
| GET | `/api/admin/staff` | List staff. Query: `q` (name, email, contact or ID). |
| POST | `/api/admin/staff` | Create staff account. Body: `name`, `email`, `password`, optional `contact`, `specialization`, `experience_years`. |
| PUT | `/api/admin/staff/<staff_id>` | Update staff details, `status` (Active/Inactive) or password. |
| GET | `/api/admin/users` | List trekkers and staff. Query: `q` (name, email or ID), `role` (trekker/staff). |
| PUT | `/api/admin/users/<user_id>/status` | Body: `action` = `deactivate`, `activate`, `blacklist` or `unblacklist`. The admin account cannot be modified. |
| GET | `/api/admin/users/<user_id>/history` | Full trekking history of one user. |
| GET | `/api/admin/bookings` | All bookings. Query: `q` (user, email or trek), `status`, `trek_id`. |
| GET | `/api/admin/reports` | Statistics: popular treks, monthly bookings, treks by difficulty, bookings by status, treks completed, unique participants. |
| POST | `/api/admin/reports/monthly` | Queue the monthly report job now (returns 202 and `task_id`). |

## Trek Staff

Staff can act only on treks assigned to them (403 otherwise).

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/staff/dashboard` | Assigned treks with registered-user counts and totals. |
| GET | `/api/staff/treks` | Assigned treks, each with the status changes currently allowed. |
| GET | `/api/staff/treks/<trek_id>/participants` | Registered participants (name, email, phone, booking and payment status). |
| PUT | `/api/staff/treks/<trek_id>/slots` | Body: `available_slots`. Not allowed once the trek is Ongoing or Completed. |
| PUT | `/api/staff/treks/<trek_id>/status` | Body: `status`. Allowed flow: Approved -> Open <-> Closed -> Ongoing -> Completed. Completing marks Booked bookings as Completed. |
| PUT | `/api/staff/treks/<trek_id>/participants/<booking_id>/cancel` | Remove a participant and free the slot. |

## Trekker

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/treks` | Approved and Open upcoming treks. Query: `q`, `difficulty`, `location`, `min_duration`, `max_duration`. Cached in Redis; response header `X-Cache: HIT/MISS`. |
| GET | `/api/treks/<trek_id>` | Trek details (cached). |
| POST | `/api/treks/<trek_id>/book` | Book a trek. Rules: trek must be Open, slots must remain, no duplicate booking. 201 on success, 409 if full or duplicate. |
| POST | `/api/bookings/<booking_id>/cancel` | Cancel own active booking and free the slot. |
| POST | `/api/bookings/<booking_id>/pay` | Simulated payment, sets payment status to Paid. |
| GET | `/api/user/dashboard` | Available treks count, booked, completed and cancelled counts, active booked treks. |
| GET | `/api/user/bookings` | Own active bookings. |
| GET | `/api/user/history` | Own complete booking and trekking history. |

## Background jobs (Celery)

| Method | Endpoint | Role | Description |
|---|---|---|---|
| POST | `/api/user/export` | Trekker | Start CSV export of own history. Returns 202 and `task_id`; 503 if Redis or the worker is not running. |
| GET | `/api/user/export/<task_id>` | Trekker | Job state: `PENDING` or `SUCCESS` (with `records`, `filename`). |
| GET | `/api/user/export/<task_id>/download` | Trekker | Download the CSV (`text/csv`). Only the owner can download. |

Scheduled by Celery Beat: `send_daily_reminders` (daily 08:00), `send_monthly_report` (1st of each month, 07:00).
Also queued on booking and cancellation: `send_booking_notification`.

## Public and app shell

| Method | Endpoint | Role | Description |
|---|---|---|---|
| GET | `/api/public/stats` | Public | Read-only landing statistics (cached 5 minutes). No personal data. |
| GET | `/` | Public | Vue single-page app entry (Jinja template). |
| GET | `/sw.js` | Public | PWA service worker. |
