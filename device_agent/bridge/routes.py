"""
ClovUp Device Agent — Bridge API Routes.

Local FastAPI endpoints called by the Angular POS frontend
to interact with the fiscal printer.
"""

import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

from printers.base import get_printer
from api_client import backend_client
from local_buffer import store_receipt

logger = logging.getLogger(__name__)
router = APIRouter(tags=["bridge"])


# ── Request / Response schemas ──

class ReceiptItem(BaseModel):
    name: str
    quantity: float
    price: float
    vat_group: str = "Б"
    discount_pct: float = 0


class PrintReceiptRequest(BaseModel):
    order_id: int
    receipt_number: str
    items: list[ReceiptItem]
    payments: list[dict]  # [{method: "CASH", amount: 10.00}]
    cashier_name: str = ""
    is_storno: bool = False
    storno_reason: str = ""
    original_receipt_number: str = ""


class CashOperationRequest(BaseModel):
    operation_type: str  # SAFE_IN | SAFE_OUT
    amount: float
    notes: str = ""


class ReportRequest(BaseModel):
    report_type: str  # X | Z


class ReprintRequest(BaseModel):
    receipt_number: str


class PrintResult(BaseModel):
    success: bool
    fiscal_number: Optional[str] = None
    error: Optional[str] = None


# ── Endpoints ──

@router.post("/print-receipt", response_model=PrintResult)
async def print_receipt(req: PrintReceiptRequest):
    """Print a fiscal receipt on the connected printer."""
    printer = get_printer()
    try:
        fiscal_number = printer.print_receipt(
            items=[item.model_dump() for item in req.items],
            payments=req.payments,
            cashier=req.cashier_name,
            is_storno=req.is_storno,
            storno_reason=req.storno_reason,
            original_receipt=req.original_receipt_number,
        )

        # Upload to backend
        receipt_data = {
            "order": req.order_id,
            "receipt_number": req.receipt_number,
            "fiscal_number": fiscal_number,
            "is_storno": req.is_storno,
        }
        try:
            backend_client.send_fiscal_receipt(receipt_data)
        except Exception:
            store_receipt(receipt_data)
            logger.warning("Backend unreachable, receipt buffered locally.")

        return PrintResult(success=True, fiscal_number=fiscal_number)

    except Exception as e:
        logger.exception("Print receipt failed")
        return PrintResult(success=False, error=str(e))


@router.post("/cash-operation", response_model=PrintResult)
async def cash_operation(req: CashOperationRequest):
    """Execute safe-in or safe-out on the fiscal printer."""
    printer = get_printer()
    try:
        if req.operation_type == "SAFE_IN":
            printer.safe_in(req.amount)
        elif req.operation_type == "SAFE_OUT":
            printer.safe_out(req.amount)
        else:
            raise HTTPException(400, f"Unknown operation: {req.operation_type}")
        return PrintResult(success=True)
    except Exception as e:
        logger.exception("Cash operation failed")
        return PrintResult(success=False, error=str(e))


@router.post("/report", response_model=PrintResult)
async def print_report(req: ReportRequest):
    """Print X or Z report."""
    printer = get_printer()
    try:
        if req.report_type == "X":
            printer.x_report()
        elif req.report_type == "Z":
            result = printer.z_report()
            # Upload Z-report to backend
            try:
                backend_client.send_z_report(result or {})
            except Exception:
                logger.warning("Z-report upload failed, will retry.")
        else:
            raise HTTPException(400, f"Unknown report type: {req.report_type}")
        return PrintResult(success=True)
    except Exception as e:
        logger.exception("Report failed")
        return PrintResult(success=False, error=str(e))


@router.post("/reprint", response_model=PrintResult)
async def reprint_receipt(req: ReprintRequest):
    """Reprint a fiscal receipt by number."""
    printer = get_printer()
    try:
        printer.reprint(req.receipt_number)
        return PrintResult(success=True)
    except Exception as e:
        logger.exception("Reprint failed")
        return PrintResult(success=False, error=str(e))


@router.get("/printer-status")
async def printer_status():
    """Check fiscal printer connection status."""
    printer = get_printer()
    try:
        status = printer.get_status()
        return {"connected": True, **status}
    except Exception as e:
        return {"connected": False, "error": str(e)}
