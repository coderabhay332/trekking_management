import re
from functools import wraps
from flask import jsonify
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity

from backend.extensions import db
from backend.models import User

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
PHONE_RE = re.compile(r"^[0-9+\-\s]{7,20}$")


def error(message, status=400):
    return jsonify({"error": message}), status


def current_user():
    return db.session.get(User, int(get_jwt_identity()))


def role_required(*roles):
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            user = current_user()
            if not user or not user.can_login:
                return error("Account is inactive or blacklisted", 403)
            if roles and user.role not in roles:
                return error("You do not have access to this resource", 403)
            return fn(*args, **kwargs)

        return wrapper

    return decorator


def validate_user_fields(data, require_password=True):
    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    phone = (data.get("phone") or "").strip()
    if not name:
        return "Name is required"
    if not EMAIL_RE.match(email):
        return "A valid email is required"
    if require_password and len(password) < 6:
        return "Password must be at least 6 characters"
    if phone and not PHONE_RE.match(phone):
        return "Phone number is invalid"
    return None
