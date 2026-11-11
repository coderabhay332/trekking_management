from datetime import date, datetime

from backend.extensions import db
from backend.models import Trek, Booking, DIFFICULTIES, TREK_STATUSES


def parse_date(value):
    if isinstance(value, date):
        return value
    return datetime.strptime(str(value)[:10], "%Y-%m-%d").date()


def validate_trek_payload(data, partial=False):
    clean = {}
    required = ("name", "location", "difficulty", "total_slots", "start_date", "end_date")
    if not partial:
        for field in required:
            if data.get(field) in (None, ""):
                return None, f"{field.replace('_', ' ').capitalize()} is required"

    if "name" in data:
        name = (data["name"] or "").strip()
        if not name:
            return None, "Name is required"
        clean["name"] = name
    if "location" in data:
        location = (data["location"] or "").strip()
        if not location:
            return None, "Location is required"
        clean["location"] = location
    if "difficulty" in data:
        if data["difficulty"] not in DIFFICULTIES:
            return None, "Difficulty must be Easy, Moderate or Hard"
        clean["difficulty"] = data["difficulty"]
    for field in ("total_slots", "duration_days"):
        if data.get(field) not in (None, ""):
            try:
                value = int(data[field])
            except (TypeError, ValueError):
                return None, f"{field.replace('_', ' ').capitalize()} must be a number"
            if value < 1:
                return None, f"{field.replace('_', ' ').capitalize()} must be at least 1"
            clean[field] = value
    if "price" in data:
        try:
            price = float(data["price"] or 0)
        except (TypeError, ValueError):
            return None, "Price must be a number"
        if price < 0:
            return None, "Price cannot be negative"
        clean["price"] = price
    for field in ("start_date", "end_date"):
        if field in data and data[field] not in (None, ""):
            try:
                clean[field] = parse_date(data[field])
            except ValueError:
                return None, f"{field.replace('_', ' ').capitalize()} must be YYYY-MM-DD"
    for field in ("description", "instructions"):
        if field in data:
            clean[field] = (data[field] or "").strip() or None
    if "status" in data and data["status"] not in (None, ""):
        if data["status"] not in TREK_STATUSES:
            return None, "Invalid trek status"
        clean["status"] = data["status"]
    return clean, None


def active_bookings_count(trek):
    return Booking.query.filter(Booking.trek_id == trek.id, Booking.status.in_(("Booked", "Completed"))).count()


def set_trek_status(trek, status):
    trek.status = status
    if status == "Completed":
        for booking in trek.bookings:
            if booking.status == "Booked":
                booking.status = "Completed"
    db.session.flush()


STAFF_TRANSITIONS = {
    "Approved": ("Open",),
    "Open": ("Closed", "Ongoing"),
    "Closed": ("Open", "Ongoing"),
    "Ongoing": ("Completed",),
    "Completed": (),
    "Pending": (),
}


def cancel_booking(booking):
    if booking.status != "Booked":
        return False
    booking.status = "Cancelled"
    booking.cancelled_at = datetime.utcnow()
    if booking.payment_status == "Paid":
        booking.payment_status = "Refunded"
    booking.trek.available_slots = min(booking.trek.total_slots, booking.trek.available_slots + 1)
    return True


def search_filter(query, model_id, text_columns, q):
    q = (q or "").strip()
    if not q:
        return query
    conditions = [col.ilike(f"%{q}%") for col in text_columns]
    if q.isdigit():
        conditions.append(model_id == int(q))
    return query.filter(db.or_(*conditions))
