import os

from celery.result import AsyncResult
from flask import Blueprint, current_app, jsonify, send_file

from backend.models import ROLE_ADMIN, ROLE_TREKKER
from backend.utils import error, role_required, current_user
from backend.tasks import export_booking_history, send_monthly_report
from backend.celery_app import celery

jobs_bp = Blueprint("jobs", __name__, url_prefix="/api")


def _queue(task, *args):
    try:
        return task.apply_async(args=args, retry=False), None
    except Exception:
        return None, error("Background worker is unavailable. Start Redis and the Celery worker.", 503)


@jobs_bp.post("/user/export")
@role_required(ROLE_TREKKER)
def start_export():
    result, problem = _queue(export_booking_history, current_user().id)
    if problem:
        return problem
    return jsonify({"message": "Export started", "task_id": result.id}), 202


def _export_result(task_id):
    result = AsyncResult(task_id, app=celery)
    if result.state == "SUCCESS":
        data = result.result or {}
        if data.get("user_id") != current_user().id:
            return None, error("Export not found", 404)
        return data, None
    if result.state == "FAILURE":
        return None, error("Export failed", 500)
    return None, None


@jobs_bp.get("/user/export/<task_id>")
@role_required(ROLE_TREKKER)
def export_status(task_id):
    data, problem = _export_result(task_id)
    if problem:
        return problem
    if data is None:
        return jsonify({"state": "PENDING"})
    return jsonify({"state": "SUCCESS", "records": data["records"], "filename": data["filename"]})


@jobs_bp.get("/user/export/<task_id>/download")
@role_required(ROLE_TREKKER)
def export_download(task_id):
    data, problem = _export_result(task_id)
    if problem:
        return problem
    if data is None:
        return error("Export is not ready yet", 409)
    path = os.path.join(current_app.config["EXPORT_DIR"], os.path.basename(data["filename"]))
    if not os.path.exists(path):
        return error("Export file has expired", 410)
    return send_file(path, as_attachment=True, download_name=data["filename"], mimetype="text/csv")


@jobs_bp.post("/admin/reports/monthly")
@role_required(ROLE_ADMIN)
def trigger_monthly_report():
    result, problem = _queue(send_monthly_report)
    if problem:
        return problem
    return jsonify({"message": "Monthly report queued", "task_id": result.id}), 202
