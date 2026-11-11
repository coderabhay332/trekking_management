from datetime import date, datetime

from flask import Blueprint, request, jsonify, make_response
from sqlalchemy import update

from backend.extensions import db
from backend.models import Trek, Booking, ROLE_TREKKER
from backend.utils import error, role_required, current_user
from backend.services import cancel_booking
from backend.cache import cached

trekker_bp = Blueprint("trekker", __name__, url_prefix="/api")

VISIBLE_STATUSES = ("Approved", "Open")


def filtered_treks(args):
    query = Trek.query.filter(Trek.status.in_(VISIBLE_STATUSES), Trek.end_date >= date.today())
    q = (args.get("q") or "").strip()
    if q:
        query = query.filter(db.or_(Trek.name.ilike(f"%{q}%"), Trek.description.ilike(f"%{q}%")))
    if args.get("difficulty"):
        query = query.filter(Trek.difficulty == args["difficulty"])
    if args.get("location"):
        query = query.filter(Trek.location.ilike(f"%{args['location'].strip()}%"))
    try:
        if args.get("min_duration"):
            query = query.filter(Trek.duration_days >= int(args["min_duration"]))
        if args.get("max_duration"):
            query = query.filter(Trek.duration_days <= int(args["max_duration"]))
    except ValueError:
        pass
    return query.order_by(Trek.start_date).all()


@trekker_bp.get("/treks")
@role_required(ROLE_TREKKER)
def list_treks():
    user = current_user()
    key = "list:" + "&".join(f"{k}={v}" for k, v in sorted(request.args.items()) if v)
    base, hit = cached("treks", key, lambda: [t.to_dict() for t in filtered_treks(request.args)])
    booked = {b.trek_id for b in Booking.query.filter_by(user_id=user.id, status="Booked")}
    result = [{**item, "already_booked": item["id"] in booked} for item in base]
    response = make_response(jsonify(result))
    response.headers["X-Cache"] = "HIT" if hit else "MISS"
    return response


@trekker_bp.get("/treks/<int:trek_id>")
@role_required(ROLE_TREKKER)
def trek_detail(trek_id):
    trek = db.session.get(Trek, trek_id)
    if not trek or trek.status not in VISIBLE_STATUSES + ("Closed", "Ongoing", "Completed"):
        return error("Trek not found", 404)
    data, hit = cached("treks", f"detail:{trek.id}", trek.to_dict)
    data["already_booked"] = (
        Booking.query.filter_by(user_id=current_user().id, trek_id=trek.id, status="Booked").first() is not None
    )
    response = make_response(jsonify(data))
    response.headers["X-Cache"] = "HIT" if hit else "MISS"
    return response


@trekker_bp.post("/treks/<int:trek_id>/book")
@role_required(ROLE_TREKKER)
def book_trek(trek_id):
    user = current_user()
    trek = db.session.get(Trek, trek_id)
    if not trek:
        return error("Trek not found", 404)
    if trek.status != "Open":
        return error("Bookings are not open for this trek", 400)
    if trek.start_date < date.today():
        return error("This trek has already started", 400)

    existing = Booking.query.filter_by(user_id=user.id, trek_id=trek.id).first()
    if existing and existing.status in ("Booked", "Completed"):
        return error("You have already booked this trek", 409)

    claimed = db.session.execute(
        update(Trek)
        .where(Trek.id == trek.id, Trek.status == "Open", Trek.available_slots > 0)
        .values(available_slots=Trek.available_slots - 1)
    )
    if claimed.rowcount == 0:
        db.session.rollback()
        return error("No slots available for this trek", 409)

    if existing:
        existing.status = "Booked"
        existing.booking_date = datetime.utcnow()
        existing.cancelled_at = None
        existing.payment_status = "Pending"
        existing.amount = trek.price
        booking = existing
    else:
        booking = Booking(user_id=user.id, trek_id=trek.id, amount=trek.price)
        db.session.add(booking)
    db.session.commit()
    return jsonify({"message": "Trek booked successfully", "booking": booking.to_dict()}), 201


def own_booking(booking_id):
    booking = db.session.get(Booking, booking_id)
    if not booking or booking.user_id != current_user().id:
        return None, error("Booking not found", 404)
    return booking, None


@trekker_bp.post("/bookings/<int:booking_id>/cancel")
@role_required(ROLE_TREKKER)
def cancel(booking_id):
    booking, problem = own_booking(booking_id)
    if problem:
        return problem
    if booking.trek.status in ("Ongoing", "Completed"):
        return error("A trek that has started cannot be cancelled")
    if not cancel_booking(booking):
        return error("Only active bookings can be cancelled")
    db.session.commit()
    return jsonify({"message": "Booking cancelled", "booking": booking.to_dict()})


@trekker_bp.post("/bookings/<int:booking_id>/pay")
@role_required(ROLE_TREKKER)
def pay(booking_id):
    booking, problem = own_booking(booking_id)
    if problem:
        return problem
    if booking.status != "Booked":
        return error("Only active bookings can be paid")
    if booking.payment_status == "Paid":
        return error("Payment already completed")
    booking.payment_status = "Paid"
    db.session.commit()
    return jsonify({"message": "Payment successful (simulated)", "booking": booking.to_dict()})


@trekker_bp.get("/user/dashboard")
@role_required(ROLE_TREKKER)
def dashboard():
    user = current_user()
    bookings = Booking.query.filter_by(user_id=user.id).order_by(Booking.booking_date.desc()).all()
    active = [b for b in bookings if b.status == "Booked"]
    return jsonify(
        {
            "available_treks": len(cached("treks", "list:", lambda: [t.to_dict() for t in filtered_treks({})])[0]),
            "booked_count": len(active),
            "completed_count": sum(1 for b in bookings if b.status == "Completed"),
            "cancelled_count": sum(1 for b in bookings if b.status == "Cancelled"),
            "booked_treks": [b.to_dict() for b in active],
        }
    )


@trekker_bp.get("/user/bookings")
@role_required(ROLE_TREKKER)
def my_bookings():
    query = Booking.query.filter_by(user_id=current_user().id, status="Booked")
    return jsonify([b.to_dict() for b in query.order_by(Booking.booking_date.desc()).all()])


@trekker_bp.get("/user/history")
@role_required(ROLE_TREKKER)
def history():
    query = Booking.query.filter_by(user_id=current_user().id)
    return jsonify([b.to_dict() for b in query.order_by(Booking.booking_date.desc()).all()])
