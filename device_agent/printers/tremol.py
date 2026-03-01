"""
ClovUp Device Agent — Tremol Fiscal Printer Driver.

Implements the BasePrinter interface for Tremol fiscal printers.
Communication via serial port or USB using the Tremol ZFP protocol.
"""

import logging
from printers.base import BasePrinter
from config import settings

logger = logging.getLogger(__name__)


class TremolPrinter(BasePrinter):
    """
    Driver for Tremol fiscal printers (FP01-KL, S25, etc.).

    Uses the Tremol ZFP (Zeka Fiscal Protocol) via serial/USB.
    """

    def __init__(self):
        self.port = settings.printer_port
        self.baudrate = settings.printer_baudrate

    def print_receipt(
        self,
        items: list[dict],
        payments: list[dict],
        cashier: str = "",
        is_storno: bool = False,
        storno_reason: str = "",
        original_receipt: str = "",
    ) -> str:
        logger.info("Tremol: print_receipt (%d items, storno=%s)", len(items), is_storno)
        raise NotImplementedError(
            "Tremol ZFP protocol implementation pending. "
            "See Tremol SDK / ZFP documentation."
        )

    def safe_in(self, amount: float) -> None:
        logger.info("Tremol: safe_in %.2f", amount)
        raise NotImplementedError("Tremol safe_in not yet implemented.")

    def safe_out(self, amount: float) -> None:
        logger.info("Tremol: safe_out %.2f", amount)
        raise NotImplementedError("Tremol safe_out not yet implemented.")

    def x_report(self) -> dict:
        logger.info("Tremol: X-report")
        raise NotImplementedError("Tremol x_report not yet implemented.")

    def z_report(self) -> dict:
        logger.info("Tremol: Z-report")
        raise NotImplementedError("Tremol z_report not yet implemented.")

    def reprint(self, receipt_number: str) -> None:
        logger.info("Tremol: reprint %s", receipt_number)
        raise NotImplementedError("Tremol reprint not yet implemented.")

    def get_status(self) -> dict:
        return {"printer": "tremol", "port": self.port, "status": "stub"}
