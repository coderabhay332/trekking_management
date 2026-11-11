import os
from flask import Flask, render_template
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

    init_db(app)

    @app.route("/")
    def index():
        return render_template("index.html")

    return app


if __name__ == "__main__":
    create_app().run(debug=True, port=5000)
