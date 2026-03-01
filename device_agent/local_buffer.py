"""
ClovUp Device Agent — Local Buffer (SQLite).

Stores receipts locally when the backend is unreachable.
Retries sending them in the background.
"""

import json
import sqlite3
import logging
from datetime import datetime, timezone
from config import settings

logger = logging.getLogger(__name__)

DB_PATH = settings.buffer_db_path


def init_db():
    """Create the local buffer table if not exists."""
    conn = sqlite3.connect(DB_PATH)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS pending_receipts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            receipt_json TEXT NOT NULL,
            created_at TEXT NOT NULL,
            retries INTEGER DEFAULT 0,
            last_error TEXT
        )
    """)
    conn.commit()
    conn.close()
    logger.info("Local buffer DB initialized at %s", DB_PATH)


def store_receipt(receipt_data: dict):
    """Store a receipt for later upload."""
    conn = sqlite3.connect(DB_PATH)
    conn.execute(
        "INSERT INTO pending_receipts (receipt_json, created_at) VALUES (?, ?)",
        (json.dumps(receipt_data), datetime.now(timezone.utc).isoformat()),
    )
    conn.commit()
    conn.close()
    logger.info("Receipt stored in local buffer.")


def get_pending() -> list[tuple[int, dict]]:
    """Return list of (id, receipt_data) for unsent receipts."""
    conn = sqlite3.connect(DB_PATH)
    rows = conn.execute(
        "SELECT id, receipt_json FROM pending_receipts ORDER BY id LIMIT 50"
    ).fetchall()
    conn.close()
    return [(row[0], json.loads(row[1])) for row in rows]


def mark_sent(receipt_id: int):
    """Remove a successfully sent receipt from the buffer."""
    conn = sqlite3.connect(DB_PATH)
    conn.execute("DELETE FROM pending_receipts WHERE id = ?", (receipt_id,))
    conn.commit()
    conn.close()


def mark_failed(receipt_id: int, error: str):
    """Record a failed retry attempt."""
    conn = sqlite3.connect(DB_PATH)
    conn.execute(
        "UPDATE pending_receipts SET retries = retries + 1, last_error = ? WHERE id = ?",
        (error, receipt_id),
    )
    conn.commit()
    conn.close()


def flush_pending():
    """Try to send all pending receipts to the backend."""
    from api_client import backend_client

    pending = get_pending()
    if not pending:
        return

    logger.info("Flushing %d pending receipts...", len(pending))
    for receipt_id, data in pending:
        try:
            backend_client.send_fiscal_receipt(data)
            mark_sent(receipt_id)
            logger.info("Receipt %d sent successfully.", receipt_id)
        except Exception as e:
            mark_failed(receipt_id, str(e))
            logger.warning("Receipt %d failed: %s", receipt_id, e)
