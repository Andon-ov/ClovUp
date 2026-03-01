"""
ClovUp Device Agent — Printer Base (Abstract).

Defines the interface all fiscal printer drivers must implement.
"""

import logging
from abc import ABC, abstractmethod
from config import settings

logger = logging.getLogger(__name__)


class BasePrinter(ABC):
    """Abstract fiscal printer interface."""

    @abstractmethod
    def print_receipt(
        self,
        items: list[dict],
        payments: list[dict],
        cashier: str = "",
        is_storno: bool = False,
        storno_reason: str = "",
        original_receipt: str = "",
    ) -> str:
        """
        Print a fiscal receipt.
        Returns the fiscal number assigned by the printer.
        """
        ...

    @abstractmethod
    def safe_in(self, amount: float) -> None:
        """Record a cash deposit (служебно въвеждане)."""
        ...

    @abstractmethod
    def safe_out(self, amount: float) -> None:
        """Record a cash withdrawal (служебно извеждане)."""
        ...

    @abstractmethod
    def x_report(self) -> dict:
        """Print an X report. Returns parsed data if available."""
        ...

    @abstractmethod
    def z_report(self) -> dict:
        """Print a Z report. Returns parsed data if available."""
        ...

    @abstractmethod
    def reprint(self, receipt_number: str) -> None:
        """Reprint a receipt by its number."""
        ...

    @abstractmethod
    def get_status(self) -> dict:
        """Return printer status info."""
        ...


def get_printer() -> BasePrinter:
    """
    Factory: return the configured printer driver instance.
    """
    ptype = settings.printer_type.lower()

    if ptype == "datecs":
        from printers.datecs import DatecsPrinter
        return DatecsPrinter()
    elif ptype == "tremol":
        from printers.tremol import TremolPrinter
        return TremolPrinter()
    elif ptype == "escpos":
        from printers.escpos_driver import EscPosPrinter
        return EscPosPrinter()
    else:
        raise ValueError(f"Unknown printer type: {ptype}")
