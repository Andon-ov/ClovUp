"""
Signals that broadcast events to the WebSocket dashboard group.
"""
import logging

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.db.models.signals import post_save
from django.dispatch import receiver

from apps.orders.models import Order, Shift, Alert

logger = logging.getLogger(__name__)


def _broadcast(tenant_slug: str, event_type: str, data: dict):
    """Send event to the tenant's dashboard WebSocket group."""
    channel_layer = get_channel_layer()
    if not channel_layer:
        return

    group_name = f'dashboard_{tenant_slug}'
    try:
        async_to_sync(channel_layer.group_send)(
            group_name,
            {
                'type': event_type,
                'data': data,
            },
        )
    except Exception as e:
        logger.error(f'WebSocket broadcast error: {e}')


def _get_tenant_slug(instance):
    """Resolve tenant slug from an instance with device → location → tenant."""
    try:
        return instance.device.location.tenant.slug
    except AttributeError:
        return None


@receiver(post_save, sender=Order)
def broadcast_order_event(sender, instance, created, **kwargs):
    slug = _get_tenant_slug(instance)
    if not slug:
        return

    data = {
        'order_id': instance.id,
        'order_number': instance.order_number,
        'status': instance.status,
        'total_amount': str(instance.total),
        'order_type': instance.order_type,
    }

    if created:
        _broadcast(slug, 'order_created', data)
    elif instance.status == 'VOIDED':
        _broadcast(slug, 'order_voided', data)
    else:
        _broadcast(slug, 'order_updated', data)


@receiver(post_save, sender=Shift)
def broadcast_shift_event(sender, instance, created, **kwargs):
    slug = _get_tenant_slug(instance)
    if not slug:
        return

    data = {
        'shift_id': instance.id,
        'device': instance.device.display_name if instance.device else '',
        'status': instance.status,
    }

    if instance.status == 'OPEN':
        _broadcast(slug, 'shift_opened', data)
    elif instance.status == 'CLOSED':
        _broadcast(slug, 'shift_closed', data)


@receiver(post_save, sender=Alert)
def broadcast_alert(sender, instance, created, **kwargs):
    if not created:
        return

    slug = None
    if instance.tenant:
        slug = instance.tenant.slug
    if not slug:
        return

    _broadcast(slug, 'alert_created', {
        'alert_id': instance.id,
        'event_type': instance.event_type,
        'action_command': instance.action_command,
    })
