from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token

from backend.extensions import db
from backend.models import User, ROLE_TREKKER
from backend.utils import error, role_required, current_user, validate_user_fields

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")


@auth_bp.post("/register")
def register():
    data = request.get_json(silent=True) or {}
    problem = validate_user_fields(data)
    if problem:
        return error(problem)
    email = data["email"].strip().lower()
    if User.query.filter_by(email=email).first():
        return error("Email is already registered", 409)
    user = User(
        name=data["name"].strip(),
        email=email,
        role=ROLE_TREKKER,
        phone=(data.get("phone") or "").strip() or None,
        address=(data.get("address") or "").strip() or None,
    )
    user.set_password(data["password"])
    db.session.add(user)
    db.session.commit()
    return jsonify({"message": "Registration successful", "user": user.to_dict()}), 201


@auth_bp.post("/login")
def login():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    if not email or not password:
        return error("Email and password are required")
    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        return error("Invalid email or password", 401)
    if user.is_blacklisted:
        return error("Your account has been blacklisted", 403)
    if not user.is_active:
        return error("Your account has been deactivated", 403)
    token = create_access_token(identity=str(user.id), additional_claims={"role": user.role})
    return jsonify({"token": token, "user": user.to_dict()})


@auth_bp.get("/me")
@role_required()
def me():
    return jsonify(current_user().to_dict())


@auth_bp.put("/profile")
@role_required()
def update_profile():
    user = current_user()
    data = request.get_json(silent=True) or {}
    merged = {"name": data.get("name", user.name), "email": user.email, "phone": data.get("phone", user.phone or "")}
    problem = validate_user_fields(merged, require_password=False)
    if problem:
        return error(problem)
    user.name = merged["name"].strip()
    user.phone = (merged["phone"] or "").strip() or None
    if "address" in data:
        user.address = (data["address"] or "").strip() or None
    if data.get("password"):
        if len(data["password"]) < 6:
            return error("Password must be at least 6 characters")
        user.set_password(data["password"])
    db.session.commit()
    return jsonify({"message": "Profile updated", "user": user.to_dict()})
