import csv
import os
from datetime import date, datetime, timedelta

from flask import current_app, render_template_string
from sqlalchemy import func

from backend.celery_app import celery
from backend.extensions import db
from backend.models import User, Trek, Booking, ROLE_ADMIN
from backend.notify import send_email, send_gchat

REMINDER_DAYS = 3

REMINDER_HTML = """
<h3>Hi {{ name }}, your trek is coming up!</h3>
<p><strong>{{ trek.name }}</strong> at {{ trek.location }}</p>
<p>Starts: {{ trek.start_date.strftime('%d %b %Y') }} &middot; Ends: {{ trek.end_date.strftime('%d %b %Y') }}
({{ days_left }} day(s) to go)</p>
{% if trek.instructions %}<p><strong>Instructions:</strong> {{ trek.instructions }}</p>{% endif %}
<p>Happy trekking!<br>TrekHub</p>
"""

REPORT_HTML = """
<html><body style="font-family:Arial,sans-serif;color:#222">
<h2 style="color:#2e7d32">TrekHub Monthly Activity Report - {{ label }}</h2>
<table cellpadding="8" style="border-collapse:collapse">
<tr><td>Treks conducted</td><td><strong>{{ treks_conducted }}</strong></td></tr>
<tr><td>Users participated</td><td><strong>{{ participants }}</strong></td></tr>
<tr><td>New bookings</td><td><strong>{{ new_bookings }}</strong></td></tr>
<tr><td>Cancellations</td><td><strong>{{ cancellations }}</strong></td></tr>
</table>
<h3>Popular treks</h3>
<table border="1" cellpadding="6" style="border-collapse:collapse">
<tr style="background:#e8f5e9"><th>Trek</th><th>Location</th><th>Bookings</th></tr>
{% for t in popular %}<tr><td>{{ t.name }}</td><td>{{ t.location }}</td><td>{{ t.bookings }}</td></tr>
{% else %}<tr><td colspan="3">No bookings this month</td></tr>{% endfor %}
</table>
<p style="color:#777;font-size:12px">Generated on {{ generated }}</p>
</body></html>
"""


def month_bounds(year, month):
    start = date(year, month, 1)
    end = date(year + (month == 12), (month % 12) + 1, 1)
    return start, end


def build_report_context(year, month):
    start, end = month_bounds(year, month)
    conducted = Trek.query.filter(Trek.status == "Completed", Trek.end_date >= start, Trek.end_date < end).all()
    conducted_ids = [t.id for t in conducted]
    participants = 0
    if conducted_ids:
        participants = (
            db.session.query(func.count(func.distinct(Booking.user_id)))
            .filter(Booking.trek_id.in_(conducted_ids), Booking.status == "Completed")
            .scalar()
        )
    in_month = (Booking.booking_date >= datetime.combine(start, datetime.min.time()), Booking.booking_date < datetime.combine(end, datetime.min.time()))
    popular = (
        db.session.query(Trek.name, Trek.location, func.count(Booking.id))
        .join(Booking, Booking.trek_id == Trek.id)
        .filter(*in_month, Booking.status != "Cancelled")
        .group_by(Trek.id)
        .order_by(func.count(Booking.id).desc())
        .limit(5)
        .all()
    )
    return {
        "label": start.strftime("%B %Y"),
        "treks_conducted": len(conducted),
        "participants": participants or 0,
        "new_bookings": Booking.query.filter(*in_month).count(),
        "cancellations": Booking.query.filter(*in_month, Booking.status == "Cancelled").count(),
        "popular": [{"name": n, "location": l, "bookings": c} for n, l, c in popular],
        "generated": datetime.now().strftime("%d %b %Y %H:%M"),
    }


@celery.task(name="backend.tasks.send_daily_reminders")
def send_daily_reminders():
    today = date.today()
    limit = today + timedelta(days=REMINDER_DAYS)
    bookings = (
        Booking.query.join(Trek)
        .join(User, Booking.user_id == User.id)
        .filter(Booking.status == "Booked", Trek.start_date >= today, Trek.start_date <= limit)
        .filter(User.is_active.is_(True), User.is_blacklisted.is_(False))
        .all()
    )
    sent = 0
    for booking in bookings:
        trek = booking.trek
        days_left = (trek.start_date - today).days
        html = render_template_string(REMINDER_HTML, name=booking.user.name, trek=trek, days_left=days_left)
        subject = f"Reminder: {trek.name} starts on {trek.start_date.strftime('%d %b')}"
        if send_email(booking.user.email, subject, html):
            sent += 1
        send_gchat(f"Reminder for {booking.user.name}: {trek.name} starts on {trek.start_date} ({days_left} day(s) to go).")
    return {"reminders": len(bookings), "emails_sent": sent}


@celery.task(name="backend.tasks.send_monthly_report")
def send_monthly_report(year=None, month=None):
    if not year or not month:
        first_this_month = date.today().replace(day=1)
        previous = first_this_month - timedelta(days=1)
        year, month = previous.year, previous.month
    context = build_report_context(year, month)
    html = render_template_string(REPORT_HTML, **context)
    os.makedirs(current_app.config["REPORT_DIR"], exist_ok=True)
    path = os.path.join(current_app.config["REPORT_DIR"], f"report_{year}_{month:02d}.html")
    with open(path, "w", encoding="utf-8") as handle:
        handle.write(html)
    admin = User.query.filter_by(role=ROLE_ADMIN).first()
    delivered = send_email(admin.email, f"TrekHub Monthly Report - {context['label']}", html) if admin else False
    return {"report": os.path.basename(path), "emailed": delivered}


@celery.task(name="backend.tasks.export_booking_history")
def export_booking_history(user_id):
    user = db.session.get(User, user_id)
    if not user:
        return {"error": "User not found"}
    bookings = Booking.query.filter_by(user_id=user_id).order_by(Booking.booking_date).all()
    os.makedirs(current_app.config["EXPORT_DIR"], exist_ok=True)
    filename = f"trek_history_{user_id}_{datetime.now().strftime('%Y%m%d%H%M%S')}.csv"
    path = os.path.join(current_app.config["EXPORT_DIR"], filename)
    with open(path, "w", newline="", encoding="utf-8") as handle:
        writer = csv.writer(handle)
        writer.writerow(["User ID", "Trek Name", "Location", "Booking Status", "Start Date", "End Date", "Booking Date"])
        for b in bookings:
            writer.writerow(
                [user_id, b.trek.name, b.trek.location, b.status, b.trek.start_date, b.trek.end_date, b.booking_date.date()]
            )
    send_email(
        user.email,
        "Your trekking history export is ready",
        f"<p>Hi {user.name}, your export with {len(bookings)} record(s) is ready. Download it from your dashboard.</p>",
    )
    return {"user_id": user_id, "filename": filename, "records": len(bookings)}


@celery.task(name="backend.tasks.send_booking_notification")
def send_booking_notification(booking_id, kind):
    booking = db.session.get(Booking, booking_id)
    if not booking:
        return False
    trek = booking.trek
    action = "confirmed" if kind == "booked" else "cancelled"
    html = (
        f"<h3>Booking {action}</h3><p>Hi {booking.user.name}, your booking for <strong>{trek.name}</strong> "
        f"({trek.location}, {trek.start_date.strftime('%d %b %Y')} - {trek.end_date.strftime('%d %b %Y')}) has been {action}.</p>"
    )
    return send_email(booking.user.email, f"Booking {action}: {trek.name}", html)