from flask import Blueprint, jsonify, send_from_directory, current_app
from sqlalchemy import func

from backend.extensions import db
from backend.models import User, Trek, Booking, ROLE_TREKKER
from backend.cache import cached

public_bp = Blueprint("public", __name__)


def _stats():
    popular = (
        db.session.query(Trek.name, func.count(Booking.id))
        .join(Booking, Booking.trek_id == Trek.id)
        .filter(Booking.status.in_(("Booked", "Completed")))
        .group_by(Trek.id)
        .order_by(func.count(Booking.id).desc())
        .limit(5)
        .all()
    )
    difficulty = db.session.query(Trek.difficulty, func.count(Trek.id)).group_by(Trek.difficulty).all()
    return {
        "total_treks": Trek.query.filter(Trek.status != "Pending").count(),
        "open_treks": Trek.query.filter_by(status="Open").count(),
        "completed_treks": Trek.query.filter_by(status="Completed").count(),
        "trekkers": User.query.filter_by(role=ROLE_TREKKER).count(),
        "total_bookings": Booking.query.filter(Booking.status != "Cancelled").count(),
        "popular_treks": [{"name": n, "bookings": c} for n, c in popular],
        "treks_by_difficulty": {d: c for d, c in difficulty},
    }


@public_bp.get("/api/public/stats")
def public_stats():
    data, _ = cached("treks", "public-stats", _stats, ttl=300)
    return jsonify(data)


@public_bp.get("/sw.js")
def service_worker():
    response = send_from_directory(current_app.static_folder, "sw.js", mimetype="application/javascript")
    response.headers["Service-Worker-Allowed"] = "/"
    response.headers["Cache-Control"] = "no-cache"
    return response
