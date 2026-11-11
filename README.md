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

## Run
```
redis-server
python backend/app.py
celery -A backend.celery_app.celery worker --pool=solo -l info
celery -A backend.celery_app.celery beat -l info
```

Default admin (seeded on first run): see `backend/config.py` / environment variables.
