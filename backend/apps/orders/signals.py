"""
Orders signals — auto stock decrease on PAID.
"""
import logging

from django.db import transaction
from django.db.models import F
from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import Order

logger = logging.getLogger(__name__)


@receiver(post_save, sender=Order)
def decrease_stock_on_paid(sender, instance, **kwargs):
    """
    When an order is marked as PAID, decrease stock for each item.
    Uses select_for_update() to prevent race conditions.
    """
    if instance.status != 'PAID':
        return

    # Only on status change — check if update_fields contains 'status'
    update_fields = kwargs.get('update_fields')
    if update_fields and 'status' not in update_fields:
        return

    try:
        from apps.inventory.models import Stock, StockMovement

        with transaction.atomic():
            for item in instance.items.all():
                if not item.product:
                    continue

                # Try to decrease stock
                stock = Stock.objects.select_for_update().filter(
                    location=instance.location,
                    product=item.product,
                ).first()

                if stock:
                    stock.quantity = F('quantity') - item.quantity
                    stock.save(update_fields=['quantity'])

                    # Record movement
                    StockMovement.objects.create(
                        location=instance.location,
                        product=item.product,
                        movement_type='SALE',
                        quantity=-item.quantity,
                        cost_price=item.cost_price,
                        reference_id=instance.uuid,
                        notes=f'Auto: Order {instance.order_number}',
                    )

    except Exception as e:
        logger.error(f'Stock decrease error for order {instance.order_number}: {e}')
