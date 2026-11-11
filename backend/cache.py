import json
import logging

import redis
from flask import current_app
from sqlalchemy import event
from sqlalchemy.orm import Session

from backend.models import Trek, Booking, StaffProfile, User

log = logging.getLogger("tma.cache")

PREFIX = "tma"
_client = None
_registered = False


def client():
    global _client
    if _client is None:
        _client = redis.Redis.from_url(
            current_app.config["REDIS_URL"],
            decode_responses=True,
            socket_connect_timeout=1,
            socket_timeout=1,
        )
    return _client


def _version(namespace):
    return client().get(f"{PREFIX}:ver:{namespace}") or "0"


def cached(namespace, key, loader, ttl=None):
    ttl = ttl or current_app.config["CACHE_TTL"]
    try:
        full_key = f"{PREFIX}:{namespace}:v{_version(namespace)}:{key}"
        raw = client().get(full_key)
        if raw is not None:
            return json.loads(raw), True
    except redis.RedisError as exc:
        log.warning("Cache read skipped: %s", exc)
        return loader(), False
    value = loader()
    try:
        client().setex(full_key, ttl, json.dumps(value))
    except redis.RedisError as exc:
        log.warning("Cache write skipped: %s", exc)
    return value, False


def invalidate(namespace="treks"):
    try:
        client().incr(f"{PREFIX}:ver:{namespace}")
    except redis.RedisError as exc:
        log.warning("Cache invalidation skipped: %s", exc)


def init_cache(app):
    global _registered
    if _registered:
        return
    _registered = True
    tracked = (Trek, Booking, StaffProfile, User)

    @event.listens_for(Session, "after_flush")
    def mark_changes(session, flush_context):
        changed = list(session.new) + list(session.dirty) + list(session.deleted)
        if any(isinstance(obj, tracked) for obj in changed):
            session.info["cache_dirty"] = True

    @event.listens_for(Session, "after_commit")
    def invalidate_after_commit(session):
        if session.info.pop("cache_dirty", False):
            with app.app_context():
                invalidate("treks")

    @event.listens_for(Session, "after_soft_rollback")
    def clear_flag(session, previous_transaction):
        session.info.pop("cache_dirty", None)
