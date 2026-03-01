"""
Fiscal views — Н-18 compliance operations.

These endpoints proxy requests to the Device Agent (Python FastAPI on localhost),
which communicates with the physical fiscal printer via serial/USB.

Flow: Angular → Django API → Device Agent (FastAPI) → Fiscal Printer
"""
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from core.permissions import IsTenantMember, IsManagerOrAbove, IsDeviceAuthenticated
from apps.orders.models import (
    Order, FiscalReceipt, DailyZReport, CashOperation, Shift,
)


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsTenantMember])
def print_fiscal_receipt(request):
    """
    POST /api/v1/fiscal/receipt/
    Trigger fiscal receipt print for a given order.
    The actual printing is handled by the Device Agent.
    """
    order_id = request.data.get('order_id')
    if not order_id:
        return Response(
            {'detail': 'order_id is required.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        order = Order.objects.get(
            id=order_id,
            tenant=request.tenant,
        )
    except Order.DoesNotExist:
        return Response(
            {'detail': 'Поръчката не е намерена.'},
            status=status.HTTP_404_NOT_FOUND,
        )

    if order.status != 'PAID':
        return Response(
            {'detail': 'Само платени поръчки могат да бъдат фискализирани.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Check if already printed (idempotency)
    existing = FiscalReceipt.objects.filter(order=order, is_storno=False).first()
    if existing:
        return Response({
            'detail': 'Фискалният бон вече е издаден.',
            'fiscal_receipt_id': existing.id,
            'receipt_number': existing.receipt_number,
        })

    # Build receipt payload for Device Agent
    items = []
    for item in order.items.all():
        items.append({
            'name': item.product_name[:36],  # Fiscal printer limit
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

    payload = {
        'order_uuid': str(order.uuid),
        'order_number': order.order_number,
        'items': items,
        'payments': payments,
        'total': str(order.total),
    }

    # NOTE: In production, this calls the Device Agent's /fiscal/receipt endpoint.
    # For now, we create a placeholder FiscalReceipt record.
    fiscal_receipt = FiscalReceipt.objects.create(
        order=order,
        receipt_number='',  # Filled by Device Agent response
        fiscal_memory='',   # Filled by Device Agent response
        device_serial='',   # Filled by Device Agent response
        raw_response=payload,
        idempotency_key=str(order.uuid),
    )

    return Response({
        'fiscal_receipt_id': fiscal_receipt.id,
        'status': 'PENDING',
        'message': 'Фискалният бон е изпратен за печат.',
    }, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsTenantMember])
def print_storno_receipt(request):
    """
    POST /api/v1/fiscal/storno/
    Print a storno (reversal) fiscal receipt.
    """
    order_id = request.data.get('order_id')
    reason = request.data.get('reason', 'Връщане на стока')
    storno_type = request.data.get('storno_type', 'OPERATOR_ERROR')

    if not order_id:
        return Response(
            {'detail': 'order_id is required.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        order = Order.objects.get(
            id=order_id,
            tenant=request.tenant,
        )
    except Order.DoesNotExist:
        return Response(
            {'detail': 'Поръчката не е намерена.'},
            status=status.HTTP_404_NOT_FOUND,
        )

    original_receipt = FiscalReceipt.objects.filter(
        order=order, is_storno=False,
    ).first()

    if not original_receipt:
        return Response(
            {'detail': 'Няма оригинален фискален бон за тази поръчка.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Check if storno already exists
    existing_storno = FiscalReceipt.objects.filter(
        storno_of=original_receipt,
    ).first()
    if existing_storno:
        return Response({
            'detail': 'Сторно бонът вече е издаден.',
            'fiscal_receipt_id': existing_storno.id,
        })

    storno_receipt = FiscalReceipt.objects.create(
        order=order,
        receipt_number='',
        fiscal_memory='',
        device_serial='',
        is_storno=True,
        storno_of=original_receipt,
        storno_reason=reason,
        raw_response={
            'storno_type': storno_type,
            'reason': reason,
            'original_receipt': original_receipt.receipt_number,
        },
        idempotency_key=f'storno-{order.uuid}',
    )

    return Response({
        'fiscal_receipt_id': storno_receipt.id,
        'status': 'PENDING',
        'message': 'Сторно бонът е изпратен за печат.',
    }, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsTenantMember])
def cash_operation(request):
    """
    POST /api/v1/fiscal/cash-operation/
    Service in (служебно въвеждане) or service out (служебно извеждане).
    """
    operation_type = request.data.get('operation_type')
    amount = request.data.get('amount')
    notes = request.data.get('notes', '')
    device_id = request.data.get('device_id')

    if operation_type not in ['SERVICE_IN', 'SERVICE_OUT']:
        return Response(
            {'detail': 'operation_type must be SERVICE_IN or SERVICE_OUT.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not amount or float(amount) <= 0:
        return Response(
            {'detail': 'amount must be positive.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Verify active shift
    active_shift = Shift.objects.filter(
        device_id=device_id,
        status='OPEN',
    ).first()

    if not active_shift:
        return Response(
            {'detail': 'Няма отворена смяна за това устройство.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Resolve TenantUser for cashier field
    cashier = None
    if hasattr(request, 'user') and request.user.is_authenticated:
        try:
            cashier = request.user.tenantuser
        except Exception:
            pass

    cash_op = CashOperation.objects.create(
        shift=active_shift,
        device_id=device_id,
        cashier=cashier,
        operation_type=operation_type,
        amount=amount,
        notes=notes,
    )

    return Response({
        'id': cash_op.id,
        'operation_type': cash_op.operation_type,
        'amount': str(cash_op.amount),
        'notes': cash_op.notes,
        'created_at': cash_op.created_at,
    }, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsTenantMember, IsManagerOrAbove])
def x_report(request):
    """
    POST /api/v1/fiscal/x-report/
    Request X report from fiscal printer (non-zeroing).
    """
    device_id = request.data.get('device_id')

    # NOTE: In production, this calls Device Agent's /fiscal/x-report
    return Response({
        'status': 'PENDING',
        'message': 'X отчет е изпратен за печат.',
        'device_id': device_id,
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsTenantMember, IsManagerOrAbove])
def z_report(request):
    """
    POST /api/v1/fiscal/z-report/
    Request Z report from fiscal printer (zeroing, end of day).
    Creates a DailyZReport record.
    """
    device_id = request.data.get('device_id')

    if not device_id:
        return Response(
            {'detail': 'device_id is required.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Check if Z report already exists for today
    today = timezone.now().date()
    # Resolve location from device
    from apps.tenants.models import POSDevice
    try:
        device = POSDevice.objects.select_related('location').get(id=device_id)
    except POSDevice.DoesNotExist:
        return Response(
            {'detail': 'Устройството не е намерено.'},
            status=status.HTTP_404_NOT_FOUND,
        )

    existing = DailyZReport.objects.filter(
        location=device.location,
        date=today,
    ).first()

    if existing:
        return Response({
            'detail': 'Z отчет за днес вече е издаден.',
            'z_report_id': existing.id,
        })

    # Calculate expected totals from orders
    from django.db.models import Sum, Count
    daily_orders = Order.objects.filter(
        device_id=device_id,
        status='PAID',
        created_at__date=today,
    )
    agg = daily_orders.aggregate(
        total=Sum('total'),
        count=Count('id'),
    )

    z_report_obj = DailyZReport.objects.create(
        location=device.location,
        date=today,
        expected_total=agg['total'] or 0,
        fiscal_total=0,  # Updated when Device Agent responds
        difference=0,
        status='BALANCED',
        closed_by=getattr(request, 'user', None) and hasattr(request.user, 'tenantuser') and request.user.tenantuser or device.location.tenant.users.first(),  # Resolve TenantUser
        closed_at=timezone.now(),
    )

    return Response({
        'z_report_id': z_report_obj.id,
        'status': 'PENDING',
        'message': 'Z отчет е изпратен за печат.',
        'expected_total': str(z_report_obj.expected_total),
    }, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsTenantMember])
def printer_status(request):
    """
    GET /api/v1/fiscal/printer-status/
    Check fiscal printer status via Device Agent.
    """
    device_id = request.query_params.get('device_id')

    # NOTE: In production, this calls Device Agent's /fiscal/status
    return Response({
        'device_id': device_id,
        'status': 'UNKNOWN',
        'message': 'Статусът не е наличен — Device Agent не е конфигуриран.',
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsTenantMember])
def reprint_receipt(request):
    """
    POST /api/v1/fiscal/reprint/
    Reprint a fiscal receipt copy (duplicate).
    """
    receipt_id = request.data.get('receipt_id')

    if not receipt_id:
        return Response(
            {'detail': 'receipt_id is required.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        receipt = FiscalReceipt.objects.get(
            id=receipt_id,
            order__tenant=request.tenant,
        )
    except FiscalReceipt.DoesNotExist:
        return Response(
            {'detail': 'Фискалният бон не е намерен.'},
            status=status.HTTP_404_NOT_FOUND,
        )

    # NOTE: In production, call Device Agent /fiscal/reprint
    return Response({
        'status': 'PENDING',
        'message': 'Дубликат е изпратен за печат.',
        'receipt_id': receipt.id,
        'receipt_number': receipt.receipt_number,
    })


# ─── Device Agent callback (called by Device Agent, not frontend) ───

@api_view(['POST'])
@permission_classes([IsDeviceAuthenticated])
def device_fiscal_callback(request):
    """
    POST /api/v1/fiscal/callback/
    Called by Device Agent after fiscal operation completes.
    Updates FiscalReceipt with actual printer data.
    """
    idempotency_key = request.data.get('idempotency_key')
    receipt_number = request.data.get('receipt_number', '')
    fiscal_memory = request.data.get('fiscal_memory', '')
    device_serial = request.data.get('device_serial', '')
    success = request.data.get('success', False)
    raw_response = request.data.get('raw_response', {})
    error = request.data.get('error')

    if not idempotency_key:
        return Response(
            {'detail': 'idempotency_key is required.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        receipt = FiscalReceipt.objects.get(idempotency_key=idempotency_key)
    except FiscalReceipt.DoesNotExist:
        return Response(
            {'detail': 'Receipt not found.'},
            status=status.HTTP_404_NOT_FOUND,
        )

    if success:
        receipt.receipt_number = receipt_number
        receipt.fiscal_memory = fiscal_memory
        receipt.device_serial = device_serial
        receipt.raw_response = raw_response
        receipt.save(update_fields=[
            'receipt_number', 'fiscal_memory', 'device_serial', 'raw_response',
        ])
    else:
        receipt.raw_response = {'error': error, **raw_response}
        receipt.save(update_fields=['raw_response'])

    return Response({'status': 'ok'})
