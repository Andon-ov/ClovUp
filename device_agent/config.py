"""
ClovUp Device Agent — Configuration.

Reads settings from .env or environment variables.
"""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Device Agent configuration."""

    # ── Backend connection ──
    backend_url: str = "http://localhost:8000"
    device_token: str = ""
    tenant_id: int = 1
    device_id: int = 1

    # ── Local server ──
    host: str = "0.0.0.0"
    port: int = 8001

    # ── Fiscal printer ──
    printer_type: str = "escpos"  # escpos | datecs | tremol
    printer_port: str = "/dev/ttyUSB0"
    printer_baudrate: int = 115200

    # ── Heartbeat ──
    heartbeat_interval: int = 30  # seconds

    # ── Local buffer ──
    buffer_db_path: str = "local_buffer.db"

    model_config = {"env_prefix": "CLOVUP_", "env_file": ".env"}


settings = Settings()
