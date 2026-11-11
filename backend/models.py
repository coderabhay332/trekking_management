from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from backend.extensions import db

ROLE_ADMIN = "admin"
ROLE_STAFF = "staff"
ROLE_TREKKER = "trekker"

DIFFICULTIES = ("Easy", "Moderate", "Hard")
TREK_STATUSES = ("Pending", "Approved", "Open", "Closed", "Ongoing", "Completed")
BOOKING_STATUSES = ("Booked", "Cancelled", "Completed")
PAYMENT_STATUSES = ("Pending", "Paid", "Refunded")


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), nullable=False, default=ROLE_TREKKER, index=True)
    phone = db.Column(db.String(20))
    address = db.Column(db.String(255))
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    is_blacklisted = db.Column(db.Boolean, nullable=False, default=False)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    staff_profile = db.relationship("StaffProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    bookings = db.relationship("Booking", back_populates="user", cascade="all, delete-orphan")

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    @property
    def can_login(self):
        return self.is_active and not self.is_blacklisted

    def to_dict(self):
        data = {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "role": self.role,
            "phone": self.phone,
            "address": self.address,
            "is_active": self.is_active,
            "is_blacklisted": self.is_blacklisted,
            "created_at": self.created_at.isoformat(),
        }
        if self.staff_profile:
            data["staff_id"] = self.staff_profile.id
        return data


class StaffProfile(db.Model):
    __tablename__ = "staff_profiles"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), unique=True, nullable=False)
    contact = db.Column(db.String(50))
    specialization = db.Column(db.String(120))
    experience_years = db.Column(db.Integer, default=0)
    status = db.Column(db.String(20), nullable=False, default="Active")

    user = db.relationship("User", back_populates="staff_profile")
    treks = db.relationship("Trek", back_populates="staff")

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "name": self.user.name,
            "email": self.user.email,
            "contact": self.contact,
            "specialization": self.specialization,
            "experience_years": self.experience_years,
            "status": self.status,
            "is_active": self.user.is_active,
            "is_blacklisted": self.user.is_blacklisted,
            "assigned_treks": [{"id": t.id, "name": t.name} for t in self.treks],
        }


class Trek(db.Model):
    __tablename__ = "treks"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), nullable=False, index=True)
    location = db.Column(db.String(150), nullable=False, index=True)
    difficulty = db.Column(db.String(20), nullable=False, index=True)
    duration_days = db.Column(db.Integer, nullable=False)
    total_slots = db.Column(db.Integer, nullable=False)
    available_slots = db.Column(db.Integer, nullable=False)
    staff_id = db.Column(db.Integer, db.ForeignKey("staff_profiles.id"))
    status = db.Column(db.String(20), nullable=False, default="Pending", index=True)
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date, nullable=False)
    price = db.Column(db.Float, nullable=False, default=0)
    description = db.Column(db.Text)
    instructions = db.Column(db.Text)
    started_at = db.Column(db.DateTime)
    completed_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    staff = db.relationship("StaffProfile", back_populates="treks")
    bookings = db.relationship("Booking", back_populates="trek", cascade="all, delete-orphan")

    @property
    def booked_count(self):
        return sum(1 for b in self.bookings if b.status in ("Booked", "Completed"))

    def to_dict(self, with_staff=True):
        data = {
            "id": self.id,
            "name": self.name,
            "location": self.location,
            "difficulty": self.difficulty,
            "duration_days": self.duration_days,
            "total_slots": self.total_slots,
            "available_slots": self.available_slots,
            "staff_id": self.staff_id,
            "status": self.status,
            "start_date": self.start_date.isoformat(),
            "end_date": self.end_date.isoformat(),
            "price": self.price,
            "description": self.description,
            "instructions": self.instructions,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "booked_count": self.booked_count,
        }
        if with_staff:
            data["staff_name"] = self.staff.user.name if self.staff else None
        return data


class Booking(db.Model):
    __tablename__ = "bookings"
    __table_args__ = (db.UniqueConstraint("user_id", "trek_id", name="uq_user_trek"),)

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    trek_id = db.Column(db.Integer, db.ForeignKey("treks.id"), nullable=False, index=True)
    booking_date = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    status = db.Column(db.String(20), nullable=False, default="Booked")
    payment_status = db.Column(db.String(20), nullable=False, default="Pending")
    amount = db.Column(db.Float, default=0)
    cancelled_at = db.Column(db.DateTime)

    user = db.relationship("User", back_populates="bookings")
    trek = db.relationship("Trek", back_populates="bookings")

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "user_name": self.user.name,
            "user_email": self.user.email,
            "trek_id": self.trek_id,
            "trek_name": self.trek.name,
            "location": self.trek.location,
            "trek_status": self.trek.status,
            "start_date": self.trek.start_date.isoformat(),
            "end_date": self.trek.end_date.isoformat(),
            "completed_at": self.trek.completed_at.isoformat() if self.trek.completed_at else None,
            "booking_date": self.booking_date.isoformat(),
            "status": self.status,
            "payment_status": self.payment_status,
            "amount": self.amount,
        }
