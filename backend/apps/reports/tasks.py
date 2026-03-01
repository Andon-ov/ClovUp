"""
Reports Celery tasks — scheduled report generation.
"""
import logging
from datetime import timedelta

from celery import shared_task
from django.utils import timezone

logger = logging.getLogger(__name__)


@shared_task(name='reports.generate_daily_z_report_summary')
def generate_daily_z_report_summary():
    """
    Daily task (Celery Beat) — generate Z-report summary for all locations.
    Runs at end of business day (e.g., 23:30).
    """
    from apps.orders.models import DailyZReport, Order
    from apps.tenants.models import Location
    from django.db.models import Sum, Count

    today = timezone.now().date()
    locations = Location.objects.select_related('tenant').all()

    count = 0
    for location in locations:
        # Skip if Z-report already exists
        if DailyZReport.objects.filter(location=location, date=today).exists():
            continue

        daily_orders = Order.objects.filter(
            location=location,
            status='PAID',
            created_at__date=today,
        )
        agg = daily_orders.aggregate(
            total=Sum('total'),
            count=Count('id'),
        )

        if agg['count'] and agg['count'] > 0:
            # Auto-create pending Z-report for locations with orders
            logger.info(
                f'Location {location.name}: {agg["count"]} orders, '
                f'total {agg["total"]} лв. (Z-report pending)'
            )
            count += 1

    logger.info(f'Daily Z-report summary: {count} locations with pending reports.')
    return count


@shared_task(name='reports.send_daily_summary_email')
def send_daily_summary_email():
    """
    Send daily sales summary email to OWNER and MANAGER users.
    Runs via Celery Beat (e.g., every day at 23:55).
    """
    from django.core.mail import send_mail
    from django.conf import settings
    from django.db.models import Sum, Count, Avg

    from apps.orders.models import Order
    from apps.tenants.models import Tenant, TenantUser

    today = timezone.now().date()
    tenants = Tenant.objects.filter(is_active=True)

    for tenant in tenants:
        orders = Order.objects.filter(
            tenant=tenant,
            status='PAID',
            created_at__date=today,
        )
        agg = orders.aggregate(
            total_revenue=Sum('total'),
            order_count=Count('id'),
            avg_ticket=Avg('total'),
        )

        if not agg['order_count']:
            continue

        # Get manager/owner emails
        recipients = TenantUser.objects.filter(
            tenant=tenant,
            role__in=['OWNER', 'MANAGER'],
            is_active=True,
            user__email__isnull=False,
        ).exclude(user__email='').values_list('user__email', flat=True)

        if not recipients:
            continue

        subject = f'ClovUp: Дневен отчет — {tenant.name} ({today})'
        message = (
            f'Дневен отчет за {tenant.name}\n'
            f'Дата: {today}\n\n'
            f'Общ оборот: {agg["total_revenue"]:.2f} лв.\n'
            f'Брой поръчки: {agg["order_count"]}\n'
            f'Среден бон: {agg["avg_ticket"]:.2f} лв.\n\n'
            f'— ClovUp система'
        )

        try:
            send_mail(
                subject=subject,
                message=message,
                from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@clovup.local'),
                recipient_list=list(recipients),
                fail_silently=True,
            )
            logger.info(f'Daily summary sent to {len(recipients)} recipients for {tenant.name}')
        except Exception as e:
            logger.error(f'Failed to send daily summary for {tenant.name}: {e}')
