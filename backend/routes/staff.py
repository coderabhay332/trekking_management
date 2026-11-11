from flask import Blueprint, request, jsonify

from backend.extensions import db
from backend.models import Trek, Booking, ROLE_STAFF
from backend.utils import error, role_required, current_user
from backend.services import STAFF_TRANSITIONS, active_bookings_count, set_trek_status, cancel_booking

staff_bp = Blueprint("staff", __name__, url_prefix="/api/staff")


def own_trek(trek_id):
    trek = db.session.get(Trek, trek_id)
    if not trek:
        return None, error("Trek not found", 404)
    profile = current_user().staff_profile
    if not profile or trek.staff_id != profile.id:
        return None, error("This trek is not assigned to you", 403)
    return trek, None


def trek_summary(trek):
    data = trek.to_dict(with_staff=False)
    data["registered_users"] = trek.booked_count
    data["allowed_status"] = list(STAFF_TRANSITIONS.get(trek.status, ()))
    return data


@staff_bp.get("/dashboard")
@role_required(ROLE_STAFF)
def dashboard():
    profile = current_user().staff_profile
    treks = Trek.query.filter_by(staff_id=profile.id).order_by(Trek.start_date).all()
    return jsonify(
        {
            "staff": profile.to_dict(),
            "total_assigned": len(treks),
            "total_registered": sum(t.booked_count for t in treks),
            "open_treks": sum(1 for t in treks if t.status == "Open"),
            "treks": [trek_summary(t) for t in treks],
        }
    )


@staff_bp.get("/treks")
@role_required(ROLE_STAFF)
def my_treks():
    profile = current_user().staff_profile
    treks = Trek.query.filter_by(staff_id=profile.id).order_by(Trek.start_date).all()
    return jsonify([trek_summary(t) for t in treks])


@staff_bp.get("/treks/<int:trek_id>/participants")
@role_required(ROLE_STAFF)
def participants(trek_id):
    trek, problem = own_trek(trek_id)
    if problem:
        return problem
    bookings = Booking.query.filter_by(trek_id=trek.id).order_by(Booking.booking_date).all()
    return jsonify(
        {
            "trek": trek_summary(trek),
            "participants": [
                {
                    "booking_id": b.id,
                    "user_id": b.user_id,
                    "name": b.user.name,
                    "email": b.user.email,
                    "phone": b.user.phone,
                    "booking_date": b.booking_date.isoformat(),
                    "status": b.status,
                    "payment_status": b.payment_status,
                }
                for b in bookings
            ],
        }
    )


@staff_bp.put("/treks/<int:trek_id>/slots")
@role_required(ROLE_STAFF)
def update_slots(trek_id):
    trek, problem = own_trek(trek_id)
    if problem:
        return problem
    try:
        available = int((request.get_json(silent=True) or {}).get("available_slots"))
    except (TypeError, ValueError):
        return error("Available slots must be a number")
    if available < 0:
        return error("Available slots cannot be negative")
    if trek.status in ("Ongoing", "Completed"):
        return error("Slots cannot be changed once the trek has started")
    trek.available_slots = available
    trek.total_slots = active_bookings_count(trek) + available
    db.session.commit()
    return jsonify({"message": "Slots updated", "trek": trek_summary(trek)})


@staff_bp.put("/treks/<int:trek_id>/status")
@role_required(ROLE_STAFF)
def update_status(trek_id):
    trek, problem = own_trek(trek_id)
    if problem:
        return problem
    status = (request.get_json(silent=True) or {}).get("status")
    if status not in STAFF_TRANSITIONS.get(trek.status, ()):
        return error(f"Cannot change status from {trek.status} to {status}")
    set_trek_status(trek, status)
    db.session.commit()
    return jsonify({"message": f"Trek marked {status}", "trek": trek_summary(trek)})


@staff_bp.put("/treks/<int:trek_id>/participants/<int:booking_id>/cancel")
@role_required(ROLE_STAFF)
def remove_participant(trek_id, booking_id):
    trek, problem = own_trek(trek_id)
    if problem:
        return problem
    booking = db.session.get(Booking, booking_id)
    if not booking or booking.trek_id != trek.id:
        return error("Booking not found", 404)
    if trek.status in ("Ongoing", "Completed"):
        return error("Participants cannot be removed once the trek has started")
    if not cancel_booking(booking):
        return error("Only active bookings can be cancelled")
    db.session.commit()
    return jsonify({"message": "Participant removed", "trek": trek_summary(trek)})
