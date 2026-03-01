"""
ClovUp Device Agent — ESC/POS Thermal Printer Driver.

Implements the BasePrinter interface for generic ESC/POS printers.
Useful for development / non-fiscal thermal receipt printers.
"""

import logging
from printers.base import BasePrinter
from config import settings

logger = logging.getLogger(__name__)

_seq_counter = 0


class EscPosPrinter(BasePrinter):
    """
    Generic ESC/POS printer driver.

    NOTE: ESC/POS printers are NOT fiscal devices. This driver is
    intended for development / testing, or for printing non-fiscal
    kitchen / customer receipts.
    """

    def __init__(self):
        self.port = settings.printer_port

    def _get_printer(self):
        """Get an escpos printer instance."""
        try:
            from escpos.printer import Serial
            return Serial(devfile=self.port)
        except Exception as e:
            logger.warning("Cannot open ESC/POS printer: %s", e)
            return None

    def print_receipt(
        self,
        items: list[dict],
        payments: list[dict],
        cashier: str = "",
        is_storno: bool = False,
        storno_reason: str = "",
        original_receipt: str = "",
    ) -> str:
        global _seq_counter
        _seq_counter += 1
        fiscal_number = f"DEV-{_seq_counter:06d}"

        p = self._get_printer()
        if p is None:
            logger.info("[SIMULATED] Receipt %s with %d items", fiscal_number, len(items))
            return fiscal_number

        try:
            p.set(align="center", bold=True)
            if is_storno:
                p.text("*** СТОРНО ***\n")
                if storno_reason:
                    p.text(f"Причина: {storno_reason}\n")
            p.text("КАСОВ БОН\n")
            p.text("================================\n")
            p.set(align="left", bold=False)

            total = 0.0
            for item in items:
                qty = item.get("quantity", 1)
                price = item.get("price", 0)
                name = item.get("name", "???")
                discount = item.get("discount_pct", 0)
                line = qty * price * (1 - discount / 100)
                total += line
                p.text(f"{name}\n")
                p.text(f"  {qty} x {price:.2f}  = {line:.2f}\n")

            p.text("================================\n")
            p.set(bold=True)
            p.text(f"ОБЩО: {total:.2f} лв.\n")
            p.set(bold=False)

            for pay in payments:
                p.text(f"  {pay.get('method', '?')}: {pay.get('amount', 0):.2f}\n")

            if cashier:
                p.text(f"\nКасиер: {cashier}\n")
            p.text(f"Фиск. №: {fiscal_number}\n")
            p.cut()
            p.close()
        except Exception as e:
            logger.error("ESC/POS print error: %s", e)

        return fiscal_number

    def safe_in(self, amount: float) -> None:
        logger.info("[ESC/POS] Safe-in: %.2f", amount)

    def safe_out(self, amount: float) -> None:
        logger.info("[ESC/POS] Safe-out: %.2f", amount)

    def x_report(self) -> dict:
        logger.info("[ESC/POS] X-report (simulated)")
        return {"type": "X", "total": 0}

    def z_report(self) -> dict:
        logger.info("[ESC/POS] Z-report (simulated)")
        return {"type": "Z", "total": 0}

    def reprint(self, receipt_number: str) -> None:
        logger.info("[ESC/POS] Reprint: %s (simulated)", receipt_number)

    def get_status(self) -> dict:
        return {"printer": "escpos", "port": self.port, "status": "dev-mode"}
