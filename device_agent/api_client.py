"""
ClovUp Device Agent — Backend API Client.

Handles all HTTP communication with the ClovUp backend server.
"""

import httpx
from config import settings


class BackendClient:
    """Synchronous client for ClovUp backend API."""

    def __init__(self):
        self.base_url = settings.backend_url.rstrip("/")
        self.headers = {
            "Authorization": f"Bearer {settings.device_token}",
            "Content-Type": "application/json",
            "X-Device-ID": str(settings.device_id),
        }

    def _url(self, path: str) -> str:
        return f"{self.base_url}{path}"

    def heartbeat(self) -> dict:
        """Send heartbeat to backend, returns device config."""
        with httpx.Client(timeout=10) as client:
            r = client.post(
                self._url(f"/api/tenants/devices/{settings.device_id}/heartbeat/"),
                headers=self.headers,
            )
            r.raise_for_status()
            return r.json()

    def send_fiscal_receipt(self, receipt_data: dict) -> dict:
        """Upload a fiscal receipt to the backend."""
        with httpx.Client(timeout=15) as client:
            r = client.post(
                self._url("/api/fiscal/receipt/"),
                headers=self.headers,
                json=receipt_data,
            )
            r.raise_for_status()
            return r.json()

    def send_z_report(self, z_report_data: dict) -> dict:
        """Upload a Z-report to the backend."""
        with httpx.Client(timeout=15) as client:
            r = client.post(
                self._url("/api/fiscal/z-report/"),
                headers=self.headers,
                json=z_report_data,
            )
            r.raise_for_status()
            return r.json()

    def get_pending_commands(self) -> list:
        """Poll backend for pending device commands."""
        with httpx.Client(timeout=10) as client:
            r = client.get(
                self._url(f"/api/tenants/devices/{settings.device_id}/commands/"),
                headers=self.headers,
            )
            if r.status_code == 404:
                return []
            r.raise_for_status()
            return r.json()


backend_client = BackendClient()
