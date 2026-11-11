from datetime import datetime
from flask import Blueprint, request, jsonify
from sqlalchemy import func

from backend.extensions import db
from backend.models import User, StaffProfile, Trek, Booking, ROLE_ADMIN, ROLE_STAFF, ROLE_TREKKER
from backend.utils import error, role_required, validate_user_fields
from backend.services import validate_trek_payload, active_bookings_count, set_trek_status, search_filter

admin_bp = Blueprint("admin", __name__, url_prefix="/api/admin")


@admin_bp.get("/dashboard")
@role_required(ROLE_ADMIN)
def dashboard():
    status_rows = db.session.query(Trek.status, func.count(Trek.id)).group_by(Trek.status).all()
    return jsonify(
        {
            "total_treks": Trek.query.count(),
            "total_users": User.query.filter_by(role=ROLE_TREKKER).count(),
            "total_staff": User.query.filter_by(role=ROLE_STAFF).count(),
            "total_bookings": Booking.query.count(),
            "active_bookings": Booking.query.filter_by(status="Booked").count(),
            "treks_by_status": {status: count for status, count in status_rows},
        }
    )


@admin_bp.get("/treks")
@role_required(ROLE_ADMIN)
def list_treks():
    query = search_filter(Trek.query, Trek.id, [Trek.name, Trek.location], request.args.get("q"))
    if request.args.get("status"):
        query = query.filter(Trek.status == request.args["status"])
    treks = query.order_by(Trek.start_date.desc()).all()
    return jsonify([t.to_dict() for t in treks])


@admin_bp.post("/treks")
@role_required(ROLE_ADMIN)
def create_trek():
    clean, problem = validate_trek_payload(request.get_json(silent=True) or {})
    if problem:
        return error(problem)
    if clean["end_date"] < clean["start_date"]:
        return error("End date cannot be before start date")
    clean.setdefault("duration_days", (clean["end_date"] - clean["start_date"]).days + 1)
    clean.pop("status", None)
    trek = Trek(available_slots=clean["total_slots"], status="Pending", **clean)
    db.session.add(trek)
    db.session.commit()
    return jsonify({"message": "Trek created", "trek": trek.to_dict()}), 201


@admin_bp.put("/treks/<int:trek_id>")
@role_required(ROLE_ADMIN)
def update_trek(trek_id):
    trek = db.session.get(Trek, trek_id)
    if not trek:
        return error("Trek not found", 404)
    clean, problem = validate_trek_payload(request.get_json(silent=True) or {}, partial=True)
    if problem:
        return error(problem)
    start = clean.get("start_date", trek.start_date)
    end = clean.get("end_date", trek.end_date)
    if end < start:
        return error("End date cannot be before start date")
    if "total_slots" in clean:
        remaining = clean["total_slots"] - active_bookings_count(trek)
        if remaining < 0:
            return error("Total slots cannot be lower than existing bookings")
        trek.available_slots = remaining
    status = clean.pop("status", None)
    for key, value in clean.items():
        setattr(trek, key, value)
    if status and status != trek.status:
        set_trek_status(trek, status)
    db.session.commit()
    return jsonify({"message": "Trek updated", "trek": trek.to_dict()})


@admin_bp.delete("/treks/<int:trek_id>")
@role_required(ROLE_ADMIN)
def delete_trek(trek_id):
    trek = db.session.get(Trek, trek_id)
    if not trek:
        return error("Trek not found", 404)
    if Booking.query.filter_by(trek_id=trek.id, status="Booked").count():
        return error("Trek has active bookings. Close it instead of deleting.", 409)
    if Booking.query.filter_by(trek_id=trek.id, status="Completed").count():
        return error("Trek has trekking history and cannot be deleted", 409)
    db.session.delete(trek)
    db.session.commit()
    return jsonify({"message": "Trek removed"})


@admin_bp.put("/treks/<int:trek_id>/assign")
@role_required(ROLE_ADMIN)
def assign_staff(trek_id):
    trek = db.session.get(Trek, trek_id)
    if not trek:
        return error("Trek not found", 404)
    staff_id = (request.get_json(silent=True) or {}).get("staff_id")
    if staff_id in (None, ""):
        trek.staff_id = None
    else:
        staff = db.session.get(StaffProfile, int(staff_id))
        if not staff:
            return error("Staff not found", 404)
        if not staff.user.can_login or staff.status != "Active":
            return error("Staff member is not active", 400)
        trek.staff_id = staff.id
        if trek.status == "Pending":
            trek.status = "Approved"
    db.session.commit()
    return jsonify({"message": "Staff assignment updated", "trek": trek.to_dict()})


@admin_bp.get("/staff")
@role_required(ROLE_ADMIN)
def list_staff():
    query = StaffProfile.query.join(User)
    query = search_filter(query, StaffProfile.id, [User.name, User.email, StaffProfile.contact], request.args.get("q"))
    return jsonify([s.to_dict() for s in query.order_by(StaffProfile.id).all()])


@admin_bp.post("/staff")
@role_required(ROLE_ADMIN)
def create_staff():
    data = request.get_json(silent=True) or {}
    problem = validate_user_fields(data)
    if problem:
        return error(problem)
    email = data["email"].strip().lower()
    if User.query.filter_by(email=email).first():
        return error("Email is already registered", 409)
    user = User(name=data["name"].strip(), email=email, role=ROLE_STAFF, phone=(data.get("phone") or "").strip() or None)
    user.set_password(data["password"])
    user.staff_profile = StaffProfile(
        contact=(data.get("contact") or data.get("phone") or "").strip() or None,
        specialization=(data.get("specialization") or "").strip() or None,
        experience_years=int(data.get("experience_years") or 0),
    )
    db.session.add(user)
    db.session.commit()
    return jsonify({"message": "Staff created", "staff": user.staff_profile.to_dict()}), 201


@admin_bp.put("/staff/<int:staff_id>")
@role_required(ROLE_ADMIN)
def update_staff(staff_id):
    staff = db.session.get(StaffProfile, staff_id)
    if not staff:
        return error("Staff not found", 404)
    data = request.get_json(silent=True) or {}
    merged = {"name": data.get("name", staff.user.name), "email": staff.user.email, "phone": data.get("contact", staff.contact or "")}
    problem = validate_user_fields(merged, require_password=False)
    if problem:
        return error(problem)
    staff.user.name = merged["name"].strip()
    staff.contact = (merged["phone"] or "").strip() or None
    staff.user.phone = staff.contact
    if "specialization" in data:
        staff.specialization = (data["specialization"] or "").strip() or None
    if "experience_years" in data:
        staff.experience_years = int(data["experience_years"] or 0)
    if data.get("status") in ("Active", "Inactive"):
        staff.status = data["status"]
    if data.get("password"):
        if len(data["password"]) < 6:
            return error("Password must be at least 6 characters")
        staff.user.set_password(data["password"])
    db.session.commit()
    return jsonify({"message": "Staff updated", "staff": staff.to_dict()})


@admin_bp.get("/users")
@role_required(ROLE_ADMIN)
def list_users():
    query = User.query.filter(User.role != ROLE_ADMIN)
    if request.args.get("role") in (ROLE_STAFF, ROLE_TREKKER):
        query = query.filter(User.role == request.args["role"])
    query = search_filter(query, User.id, [User.name, User.email], request.args.get("q"))
    return jsonify([u.to_dict() for u in query.order_by(User.id).all()])


@admin_bp.put("/users/<int:user_id>/status")
@role_required(ROLE_ADMIN)
def change_user_status(user_id):
    user = db.session.get(User, user_id)
    if not user:
        return error("User not found", 404)
    if user.role == ROLE_ADMIN:
        return error("Admin account cannot be modified", 403)
    action = (request.get_json(silent=True) or {}).get("action")
    if action == "deactivate":
        user.is_active = False
    elif action == "activate":
        user.is_active = True
    elif action == "blacklist":
        user.is_blacklisted = True
    elif action == "unblacklist":
        user.is_blacklisted = False
    else:
        return error("Action must be deactivate, activate, blacklist or unblacklist")
    if user.staff_profile:
        user.staff_profile.status = "Active" if user.can_login else "Inactive"
    db.session.commit()
    return jsonify({"message": f"User {action}d", "user": user.to_dict()})


@admin_bp.get("/bookings")
@role_required(ROLE_ADMIN)
def list_bookings():
    query = Booking.query.join(User).join(Trek)
    if request.args.get("status"):
        query = query.filter(Booking.status == request.args["status"])
    if request.args.get("trek_id"):
        query = query.filter(Booking.trek_id == int(request.args["trek_id"]))
    query = search_filter(query, Booking.id, [User.name, User.email, Trek.name], request.args.get("q"))
    return jsonify([b.to_dict() for b in query.order_by(Booking.booking_date.desc()).all()])


@admin_bp.get("/reports")
@role_required(ROLE_ADMIN)
def reports():
    popular = (
        db.session.query(Trek.id, Trek.name, func.count(Booking.id))
        .join(Booking, Booking.trek_id == Trek.id)
        .filter(Booking.status.in_(("Booked", "Completed")))
        .group_by(Trek.id)
        .order_by(func.count(Booking.id).desc())
        .limit(10)
        .all()
    )
    monthly = (
        db.session.query(func.strftime("%Y-%m", Booking.booking_date), func.count(Booking.id))
        .group_by(func.strftime("%Y-%m", Booking.booking_date))
        .order_by(func.strftime("%Y-%m", Booking.booking_date))
        .all()
    )
    difficulty = db.session.query(Trek.difficulty, func.count(Trek.id)).group_by(Trek.difficulty).all()
    booking_status = db.session.query(Booking.status, func.count(Booking.id)).group_by(Booking.status).all()
    completed = Trek.query.filter_by(status="Completed").count()
    participants = (
        db.session.query(func.count(func.distinct(Booking.user_id))).filter(Booking.status.in_(("Booked", "Completed"))).scalar()
    )
    return jsonify(
        {
            "popular_treks": [{"id": i, "name": n, "bookings": c} for i, n, c in popular],
            "monthly_bookings": [{"month": m, "count": c} for m, c in monthly],
            "treks_by_difficulty": {d: c for d, c in difficulty},
            "bookings_by_status": {s: c for s, c in booking_status},
            "treks_completed": completed,
            "unique_participants": participants or 0,
            "generated_at": datetime.utcnow().isoformat(),
        }
    )
