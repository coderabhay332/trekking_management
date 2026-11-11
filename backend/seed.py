from backend.extensions import db
from backend.models import User, ROLE_ADMIN


def seed_admin(app):
    cfg = app.config
    if User.query.filter_by(role=ROLE_ADMIN).first():
        return
    admin = User(name=cfg["ADMIN_NAME"], email=cfg["ADMIN_EMAIL"].lower(), role=ROLE_ADMIN)
    admin.set_password(cfg["ADMIN_PASSWORD"])
    db.session.add(admin)
    db.session.commit()


def init_db(app):
    with app.app_context():
        db.create_all()
        seed_admin(app)
