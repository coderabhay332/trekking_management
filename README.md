# trekking_management

Trekking Management Application (TMA) V2 - a role-based web app for Admin, Trek Staff and Trekkers.

## Stack
- Flask (API), Flask-SQLAlchemy, SQLite
- Flask-JWT-Extended (token auth)
- Vue 3 + Bootstrap 5 (CDN, single Jinja entry page)
- Redis (cache + broker), Celery + Celery Beat (batch jobs)

## Setup
```
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

Redis 5+ is required (the old Windows port 3.0 is not supported by redis-py). Docker works well:
```
docker run -d --name tma-redis -p 6379:6379 redis:7-alpine
```

## Run
Open three terminals from the project root with the virtual environment active.
```
python -m backend.app
celery -A backend.celery_app.celery worker --pool=solo -l info
celery -A backend.celery_app.celery beat -l info
```
The app is served at http://localhost:5000. The database (`backend/tma.db`) and the admin are created on first start.

Default admin: `admin@tma.com` / `Admin@123` (override with `ADMIN_EMAIL`, `ADMIN_PASSWORD`).

## Configuration (environment variables)
Copy `.env.example` to `.env` to override any value (loaded automatically, git-ignored).

| Variable | Default |
|---|---|
| `REDIS_URL` | `redis://localhost:6379/0` |
| `CELERY_BROKER_URL` | `redis://localhost:6379/1` |
| `CELERY_RESULT_BACKEND` | `redis://localhost:6379/2` |
| `MAIL_HOST` / `MAIL_PORT` | `localhost` / `1025` (use MailHog or any SMTP server) |
| `MAIL_USER` / `MAIL_PASSWORD` | empty (enables STARTTLS login when set) |
| `GCHAT_WEBHOOK_URL` | empty (optional Google Chat reminders) |

## Background jobs
- Daily reminders at 08:00 for treks starting within 3 days.
- Monthly activity report on the 1st at 07:00, emailed to the admin and saved in `backend/reports_output/`.
- CSV export of booking history, triggered from the trekker History page.
