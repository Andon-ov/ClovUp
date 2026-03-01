"""
Fiscal services — business logic layer for fiscal printer operations.

Flow: View → Service → Device Agent (FastAPI on localhost:8001) → Printer

In production, these functions call the Device Agent HTTP API.
For now, they prepare payloads and create pending records.
"""
import logging
from decimal import Decimal

import requests
from django.conf import settings
from django.utils import timezone

from apps.orders.models import CashOperation, DailyZReport, FiscalReceipt, Order

logger = logging.getLogger(__name__)

DEVICE_AGENT_URL = getattr(settings, 'DEVICE_AGENT_URL', 'http://localhost:8001')
DEVICE_AGENT_TIMEOUT = getattr(settings, 'DEVICE_AGENT_TIMEOUT', 10)


def _call_device_agent(endpoint: str, payload: dict) -> dict | None:
    """
    Call Device Agent HTTP API.
    Returns response JSON on success, None on failure.
    """
    url = f'{DEVICE_AGENT_URL}{endpoint}'
    try:
        resp = requests.post(url, json=payload, timeout=DEVICE_AGENT_TIMEOUT)
        resp.raise_for_status()
        return resp.json()
    except requests.ConnectionError:
        logger.warning(f'Device Agent not available at {url}')
        return None
    except requests.Timeout:
        logger.warning(f'Device Agent timeout at {url}')
        return None
    except Exception as e:
        logger.error(f'Device Agent error: {e}')
        return None


def build_receipt_payload(order: Order) -> dict:
    """Build fiscal receipt payload from an order."""
    items = []
    for item in order.items.all():
        items.append({
            'name': item.product_name[:36],  # Fiscal printer line limit
            'price': str(item.product_price),
            'quantity': str(item.quantity),
            'vat_group': item.vat_group,
            'discount_pct': str(item.discount_pct),
        })

    payments = []
    for payment in order.payments.all():
        payments.append({
            'method': payment.payment_method,
            'amount': str(payment.amount),
        })

    return {
        'order_uuid': str(order.uuid),
        'order_number': order.order_number,
        'items': items,
        'payments': payments,
        'total': str(order.total),
    }


def print_receipt(order: Order) -> FiscalReceipt:
    """
    Print a fiscal receipt for a paid order.
    Creates a FiscalReceipt record and sends to Device Agent.
    Returns the FiscalReceipt (PENDING or PRINTED).
    """
    # Idempotency: check for existing receipt
    existing = FiscalReceipt.objects.filter(
        order=order, is_storno=False,
    ).first()
    if existing:
        return existing

    payload = build_receipt_payload(order)

    fiscal_receipt = FiscalReceipt.objects.create(
        order=order,
        receipt_number='',
        fiscal_memory='',
        device_serial='',
        raw_response=payload,
        idempotency_key=str(order.uuid),
    )

    # Try calling Device Agent
    agent_response = _call_device_agent('/fiscal/receipt', payload)
    if agent_response and agent_response.get('success'):
        fiscal_receipt.receipt_number = agent_response.get('receipt_number', '')
        fiscal_receipt.fiscal_memory = agent_response.get('fiscal_memory', '')
        fiscal_receipt.device_serial = agent_response.get('device_serial', '')
        fiscal_receipt.raw_response = agent_response
        fiscal_receipt.status = 'PRINTED'
        fiscal_receipt.printed_at = timezone.now()
        fiscal_receipt.save()

    return fiscal_receipt


def print_storno(order: Order, reason: str, storno_type: str = 'OPERATOR_ERROR',
                 initiated_by=None) -> FiscalReceipt | None:
    """
    Print a storno fiscal receipt.
    Returns the storno FiscalReceipt or None if no original exists.
    """
    original = FiscalReceipt.objects.filter(
        order=order, is_storno=False,
    ).first()
    if not original:
        return None

    # Idempotency
    existing_storno = FiscalReceipt.objects.filter(storno_of=original).first()
    if existing_storno:
        return existing_storno

    storno_receipt = FiscalReceipt.objects.create(
        order=order,
        receipt_number='',
        fiscal_memory='',
        device_serial='',
        is_storno=True,
        storno_of=original,
        storno_type=storno_type,
        storno_reason=reason,
        initiated_by=initiated_by,
        raw_response={
            'storno_type': storno_type,
            'reason': reason,
            'original_receipt': original.receipt_number,
            'original_fiscal_memory': original.fiscal_memory,
            'original_device_serial': original.device_serial,
        },
        idempotency_key=f'storno-{order.uuid}',
    )

    payload = {
        'storno_type': storno_type,
        'reason': reason,
        'original_receipt_number': original.receipt_number,
        'original_fiscal_memory': original.fiscal_memory,
        'original_device_serial': original.device_serial,
        'original_printed_at': str(original.printed_at) if original.printed_at else '',
    }
    payload.update(build_receipt_payload(order))

    agent_response = _call_device_agent('/fiscal/storno', payload)
    if agent_response and agent_response.get('success'):
        storno_receipt.receipt_number = agent_response.get('receipt_number', '')
        storno_receipt.fiscal_memory = agent_response.get('fiscal_memory', '')
        storno_receipt.device_serial = agent_response.get('device_serial', '')
        storno_receipt.raw_response = agent_response
        storno_receipt.status = 'PRINTED'
        storno_receipt.printed_at = timezone.now()
        storno_receipt.save()

    return storno_receipt


def safe_in(shift, device, cashier, amount: Decimal, notes: str = '') -> CashOperation:
    """Служебно въвеждане — register cash deposit in printer."""
    cash_op = CashOperation.objects.create(
        shift=shift,
        device=device,
        cashier=cashier,
        operation_type='SERVICE_IN',
        amount=amount,
        notes=notes,
    )

    payload = {
        'operation': 'SERVICE_IN',
        'amount': str(amount),
    }
    agent_response = _call_device_agent('/fiscal/service-in', payload)
    if agent_response:
        cash_op.fiscal_confirmed = True
        cash_op.fiscal_response = agent_response
        cash_op.save(update_fields=['fiscal_confirmed', 'fiscal_response'])

    return cash_op


def safe_out(shift, device, cashier, amount: Decimal, notes: str = '') -> CashOperation:
    """Служебно извеждане — register cash withdrawal in printer."""
    cash_op = CashOperation.objects.create(
        shift=shift,
        device=device,
        cashier=cashier,
        operation_type='SERVICE_OUT',
        amount=amount,
        notes=notes,
    )

    payload = {
        'operation': 'SERVICE_OUT',
        'amount': str(amount),
    }
    agent_response = _call_device_agent('/fiscal/service-out', payload)
    if agent_response:
        cash_op.fiscal_confirmed = True
        cash_op.fiscal_response = agent_response
        cash_op.save(update_fields=['fiscal_confirmed', 'fiscal_response'])

    return cash_op


def x_report(device_id: int) -> dict:
    """Request X report from printer (non-zeroing daily report)."""
    payload = {'device_id': device_id}
    agent_response = _call_device_agent('/fiscal/x-report', payload)
    return agent_response or {'status': 'PENDING', 'message': 'Device Agent не е наличен.'}


def z_report(device, location, closed_by) -> DailyZReport | None:
    """
    Request Z report from printer (zeroing, end of day).
    Creates a DailyZReport record.
    """
    from django.db.models import Count, Sum

    today = timezone.now().date()

    # Idempotency
    existing = DailyZReport.objects.filter(location=location, date=today).first()
    if existing:
        return existing

    daily_orders = Order.objects.filter(
        device__location=location,
        status='PAID',
        created_at__date=today,
    )
    agg = daily_orders.aggregate(
        total=Sum('total'),
        count=Count('id'),
    )

    z_report_obj = DailyZReport.objects.create(
        location=location,
        date=today,
        expected_total=agg['total'] or 0,
        fiscal_total=0,
        difference=0,
        status='BALANCED',
        closed_by=closed_by,
        closed_at=timezone.now(),
    )

    payload = {'device_id': device.id, 'location': location.name}
    agent_response = _call_device_agent('/fiscal/z-report', payload)
    if agent_response and agent_response.get('fiscal_total') is not None:
        z_report_obj.fiscal_total = Decimal(str(agent_response['fiscal_total']))
        z_report_obj.difference = z_report_obj.fiscal_total - z_report_obj.expected_total
        if z_report_obj.difference > 0:
            z_report_obj.status = 'OVER'
        elif z_report_obj.difference < 0:
            z_report_obj.status = 'SHORT'
        z_report_obj.fiscal_response = agent_response
        z_report_obj.save()

    return z_report_obj


def reprint(receipt: FiscalReceipt) -> dict:
    """Reprint a fiscal receipt copy (duplicate)."""
    payload = {
        'receipt_number': receipt.receipt_number,
        'receipt_id': receipt.id,
    }
    agent_response = _call_device_agent('/fiscal/reprint', payload)
    return agent_response or {'status': 'PENDING', 'message': 'Device Agent не е наличен.'}
