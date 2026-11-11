import os
from flask import Flask, jsonify, render_template
from flask_cors import CORS

from backend.config import Config
from backend.extensions import db, jwt
from backend.seed import init_db


def create_app(config_class=Config):
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    app = Flask(
        __name__,
        template_folder=os.path.join(root, "backend", "templates"),
        static_folder=os.path.join(root, "frontend"),
        static_url_path="/static",
    )
    app.config.from_object(config_class)

    CORS(app)
    db.init_app(app)
    jwt.init_app(app)

    from backend.auth import auth_bp
    from backend.routes.admin import admin_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(admin_bp)

    init_db(app)

    @jwt.unauthorized_loader
    def missing_token(reason):
        return jsonify({"error": "Authentication required"}), 401

    @jwt.invalid_token_loader
    def invalid_token(reason):
        return jsonify({"error": "Invalid token"}), 401

    @jwt.expired_token_loader
    def expired_token(header, payload):
        return jsonify({"error": "Session expired, please log in again"}), 401

    @app.route("/")
    def index():
        return render_template("index.html")

    return app


if __name__ == "__main__":
    create_app().run(debug=True, port=5000)
