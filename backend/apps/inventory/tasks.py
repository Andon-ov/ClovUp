"""
Celery tasks for inventory — low stock alerts, etc.
"""
import logging

from celery import shared_task
from django.db.models import F

logger = logging.getLogger(__name__)


@shared_task(name='inventory.check_low_stock')
def check_low_stock():
    """
    Periodically check stock levels and create alerts for items below min_quantity.
    Runs via Celery Beat (e.g. every 30 minutes).
    """
    from apps.inventory.models import Stock
    from apps.orders.models import Alert

    low_stocks = Stock.objects.filter(
        quantity__lte=F('min_quantity'),
        min_quantity__gt=0,
    ).select_related('product', 'location')

    count = 0
    for stock in low_stocks:
        Alert.objects.get_or_create(
            tenant=stock.location.tenant if hasattr(stock.location, 'tenant') else None,
            event_type='LOW_STOCK',
            defaults={
                'min_amount': stock.min_quantity,
                'action_command': (
                    f'{stock.product.name} в {stock.location.name}: '
                    f'{stock.quantity} (мин: {stock.min_quantity})'
                ),
            },
        )
        count += 1

    logger.info(f'Low stock check: {count} alerts created/found.')
    return count
