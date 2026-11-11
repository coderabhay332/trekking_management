import os
from datetime import timedelta

BASE_DIR = os.path.abspath(os.path.dirname(__file__))


class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "tma-dev-secret-key-change-me-0123456789")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "tma-dev-jwt-secret-key-change-me-0123456789")
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=12)
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL", "sqlite:///" + os.path.join(BASE_DIR, "tma.db"))
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    ADMIN_NAME = os.getenv("ADMIN_NAME", "Administrator")
    ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "admin@tma.com")
    ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "Admin@123")

    REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    CELERY_BROKER_URL = os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/1")
    CELERY_RESULT_BACKEND = os.getenv("CELERY_RESULT_BACKEND", "redis://localhost:6379/2")
    CACHE_TTL = int(os.getenv("CACHE_TTL", "120"))

    MAIL_HOST = os.getenv("MAIL_HOST", "localhost")
    MAIL_PORT = int(os.getenv("MAIL_PORT", "1025"))
    MAIL_USER = os.getenv("MAIL_USER", "")
    MAIL_PASSWORD = os.getenv("MAIL_PASSWORD", "")
    MAIL_SENDER = os.getenv("MAIL_SENDER", "no-reply@tma.local")
    GCHAT_WEBHOOK_URL = os.getenv("GCHAT_WEBHOOK_URL", "")

    EXPORT_DIR = os.path.join(BASE_DIR, "exports")
    REPORT_DIR = os.path.join(BASE_DIR, "reports_output")
