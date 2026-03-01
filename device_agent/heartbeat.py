"""
ClovUp Device Agent — Heartbeat Service.

Sends periodic heartbeats to the backend and flushes local buffer.
"""

import logging
from apscheduler.schedulers.background import BackgroundScheduler
from config import settings

logger = logging.getLogger(__name__)

_scheduler: BackgroundScheduler | None = None


def _heartbeat_job():
    """Single heartbeat tick."""
    from api_client import backend_client
    from local_buffer import flush_pending

    try:
        result = backend_client.heartbeat()
        logger.debug("Heartbeat OK: %s", result)
    except Exception as e:
        logger.warning("Heartbeat failed: %s", e)

    # Also try to flush any buffered receipts
    try:
        flush_pending()
    except Exception as e:
        logger.warning("Buffer flush failed: %s", e)


def start_heartbeat():
    """Start the background heartbeat scheduler."""
    global _scheduler
    _scheduler = BackgroundScheduler()
    _scheduler.add_job(
        _heartbeat_job,
        "interval",
        seconds=settings.heartbeat_interval,
        id="heartbeat",
    )
    _scheduler.start()
    logger.info("Heartbeat started (every %ds).", settings.heartbeat_interval)


def stop_heartbeat():
    """Stop the heartbeat scheduler."""
    global _scheduler
    if _scheduler:
        _scheduler.shutdown(wait=False)
        logger.info("Heartbeat stopped.")
