import json
import logging
import smtplib
import urllib.request
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from flask import current_app

log = logging.getLogger("tma.notify")


def send_email(to, subject, html, text=None):
    cfg = current_app.config
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = cfg["MAIL_SENDER"]
    msg["To"] = to
    msg.attach(MIMEText(text or "Please view this message in an HTML capable client.", "plain"))
    msg.attach(MIMEText(html, "html"))
    try:
        with smtplib.SMTP(cfg["MAIL_HOST"], cfg["MAIL_PORT"], timeout=10) as server:
            if cfg["MAIL_USER"]:
                server.starttls()
                server.login(cfg["MAIL_USER"], cfg["MAIL_PASSWORD"])
            server.sendmail(cfg["MAIL_SENDER"], [to], msg.as_string())
        return True
    except Exception as exc:
        log.warning("Email to %s not delivered (%s). Subject: %s", to, exc, subject)
        return False


def send_gchat(text):
    url = current_app.config.get("GCHAT_WEBHOOK_URL")
    if not url:
        return False
    request = urllib.request.Request(
        url,
        data=json.dumps({"text": text}).encode(),
        headers={"Content-Type": "application/json; charset=UTF-8"},
    )
    try:
        urllib.request.urlopen(request, timeout=10).read()
        return True
    except Exception as exc:
        log.warning("Google Chat webhook failed: %s", exc)
        return False
