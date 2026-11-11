from celery import Celery, Task
from celery.schedules import crontab

from backend.config import Config

_flask_app = None


def get_flask_app():
    global _flask_app
    if _flask_app is None:
        from backend.app import create_app

        _flask_app = create_app()
    return _flask_app


class ContextTask(Task):
    def __call__(self, *args, **kwargs):
        with get_flask_app().app_context():
            return self.run(*args, **kwargs)


celery = Celery(
    "tma",
    broker=Config.CELERY_BROKER_URL,
    backend=Config.CELERY_RESULT_BACKEND,
    task_cls=ContextTask,
    include=["backend.tasks"],
)

celery.conf.update(
    timezone="Asia/Kolkata",
    enable_utc=True,
    broker_connection_retry_on_startup=True,
    broker_connection_timeout=2,
    result_expires=3600,
    beat_schedule={
        "daily-trek-reminders": {
            "task": "backend.tasks.send_daily_reminders",
            "schedule": crontab(hour=8, minute=0),
        },
        "monthly-activity-report": {
            "task": "backend.tasks.send_monthly_report",
            "schedule": crontab(day_of_month=1, hour=7, minute=0),
        },
    },
)
