"""
Reports views — dashboard KPIs, sales reports, VAT breakdown, exports.
All queries are filtered by tenant + optional location + date range.
"""
import csv
from datetime import timedelta
from decimal import Decimal
from io import BytesIO

from django.db.models import Sum, Count, Avg, F, Q
from django.db.models.functions import TruncDate, TruncHour
from django.http import HttpResponse
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from core.permissions import IsTenantMember, IsManagerOrAbove
from apps.orders.models import Order, OrderItem, Payment, DailyZReport, Shift
from .exporters import export_orders_excel, export_order_items_excel


def _parse_date_range(request):
    """Extract and validate date_from, date_to query params."""
    date_from = request.query_params.get('date_from')
    date_to = request.query_params.get('date_to')
    location_id = request.query_params.get('location')

    if not date_from:
        date_from = timezone.now().date()
    if not date_to:
        date_to = timezone.now().date()

    return str(date_from), str(date_to), location_id


def _base_orders(request):
    """Base queryset: tenant-filtered PAID orders."""
    date_from, date_to, location_id = _parse_date_range(request)
    qs = Order.objects.filter(
        tenant=request.tenant,
        status='PAID',
        created_at__date__gte=date_from,
        created_at__date__lte=date_to,
    )
    if location_id:
        qs = qs.filter(location_id=location_id)
    return qs


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsTenantMember])
def dashboard_kpis(request):
    """
    GET /api/v1/reports/dashboard/
    Returns today's KPIs: revenue, order count, avg ticket, top category.
    """
    orders = _base_orders(request)
    agg = orders.aggregate(
        total_revenue=Sum('total'),
        order_count=Count('id'),
        avg_ticket=Avg('total'),
    )

    # Top category by revenue
    top_category = (
        OrderItem.objects.filter(order__in=orders)
        .values('product__category__name')
        .annotate(revenue=Sum(F('product_price') * F('quantity')))
        .order_by('-revenue')
        .first()
    )

    return Response({
        'total_revenue': agg['total_revenue'] or Decimal('0.00'),
        'order_count': agg['order_count'] or 0,
        'avg_ticket': agg['avg_ticket'] or Decimal('0.00'),
        'top_category': top_category['product__category__name'] if top_category else None,
        'top_category_revenue': top_category['revenue'] if top_category else Decimal('0.00'),
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsTenantMember])
def sales_by_date(request):
    """
    GET /api/v1/reports/sales/
    Daily sales breakdown.
    """
    orders = _base_orders(request)
    data = (
        orders
        .annotate(date=TruncDate('created_at'))
        .values('date')
        .annotate(
            revenue=Sum('total'),
            count=Count('id'),
            avg_ticket=Avg('total'),
        )
        .order_by('date')
    )
    return Response(list(data))


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsTenantMember])
def sales_by_hour(request):
    """
    GET /api/v1/reports/hourly/
    Hourly sales breakdown for the date range.
    """
    orders = _base_orders(request)
    data = (
        orders
        .annotate(hour=TruncHour('created_at'))
        .values('hour')
        .annotate(
            revenue=Sum('total'),
            count=Count('id'),
        )
        .order_by('hour')
    )
    return Response(list(data))


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsTenantMember])
def top_products(request):
    """
    GET /api/v1/reports/top-products/
    Top N products by quantity sold.
    """
    limit = int(request.query_params.get('limit', 20))
    orders = _base_orders(request)

    data = (
        OrderItem.objects.filter(order__in=orders)
        .values('product_name')
        .annotate(
            total_qty=Sum('quantity'),
            total_revenue=Sum(F('product_price') * F('quantity')),
        )
        .order_by('-total_qty')[:limit]
    )
    return Response(list(data))


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsTenantMember])
def vat_breakdown(request):
    """
    GET /api/v1/reports/vat/
    VAT breakdown by group (А, Б, В, Г).
    """
    orders = _base_orders(request)

    data = (
        OrderItem.objects.filter(order__in=orders)
        .values('vat_group')
        .annotate(
            total_amount=Sum(F('product_price') * F('quantity')),
            total_items=Count('id'),
        )
        .order_by('vat_group')
    )
    return Response(list(data))


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsTenantMember])
def payment_breakdown(request):
    """
    GET /api/v1/reports/payments/
    Payment method breakdown.
    """
    date_from, date_to, location_id = _parse_date_range(request)
    qs = Payment.objects.filter(
        order__tenant=request.tenant,
        order__status='PAID',
        order__created_at__date__gte=date_from,
        order__created_at__date__lte=date_to,
    )
    if location_id:
        qs = qs.filter(order__location_id=location_id)

    data = (
        qs.values('payment_method')
        .annotate(
            total=Sum('amount'),
            count=Count('id'),
        )
        .order_by('-total')
    )
    return Response(list(data))


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsTenantMember, IsManagerOrAbove])
def z_report_history(request):
    """
    GET /api/v1/reports/z-reports/
    History of daily Z reports.
    """
    qs = DailyZReport.objects.filter(
        location__tenant=request.tenant,
    ).select_related('location', 'closed_by')

    location_id = request.query_params.get('location')
    if location_id:
        qs = qs.filter(location_id=location_id)

    date_from = request.query_params.get('date_from')
    date_to = request.query_params.get('date_to')
    if date_from:
        qs = qs.filter(date__gte=date_from)
    if date_to:
        qs = qs.filter(date__lte=date_to)

    data = qs.values(
        'id', 'location__name', 'date',
        'expected_total', 'fiscal_total', 'difference',
        'status', 'closed_by__user__username', 'created_at',
    ).order_by('-date')

    return Response(list(data))


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsTenantMember, IsManagerOrAbove])
def export_sales_csv(request):
    """
    GET /api/v1/reports/export/csv/
    Export sales data as CSV.
    """
    orders = _base_orders(request).select_related('device__location').prefetch_related('items')

    response = HttpResponse(content_type='text/csv; charset=utf-8')
    response['Content-Disposition'] = 'attachment; filename="sales_report.csv"'
    response.write('\ufeff')  # BOM for Excel UTF-8

    writer = csv.writer(response)
    writer.writerow([
        'Дата', 'Номер', 'Устройство', 'Обект', 'Тип',
        'Сума', 'Отстъпка', 'Общо', 'Статус',
    ])

    for order in orders:
        writer.writerow([
            order.created_at.strftime('%Y-%m-%d %H:%M'),
            order.order_number,
            order.device.display_name if order.device else '',
            order.device.location.name if order.device and order.device.location else '',
            order.get_order_type_display(),
            order.subtotal,
            order.discount,
            order.total,
            order.get_status_display(),
        ])

    return response


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsTenantMember, IsManagerOrAbove])
def export_sales_excel(request):
    """
    GET /api/v1/reports/export/excel/
    Export sales data as Excel (.xlsx).
    """
    orders = _base_orders(request)
    today = timezone.now().date()
    filename = f'sales_{today}.xlsx'
    return export_orders_excel(orders, filename)


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsTenantMember, IsManagerOrAbove])
def shift_report(request):
    """
    GET /api/v1/reports/shifts/
    Shift-level report with totals.
    """
    date_from, date_to, location_id = _parse_date_range(request)
    qs = Shift.objects.filter(
        device__location__tenant=request.tenant,
        opened_at__date__gte=date_from,
        opened_at__date__lte=date_to,
    ).select_related('device', 'cashier')

    if location_id:
        qs = qs.filter(device__location_id=location_id)

    data = qs.values(
        'id', 'device__display_name', 'cashier__user__username',
        'opened_at', 'closed_at',
        'opening_cash', 'closing_cash',
        'status',
    ).order_by('-opened_at')

    return Response(list(data))
