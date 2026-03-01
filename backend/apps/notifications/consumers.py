"""
Django Channels consumer for real-time dashboard updates.

WebSocket URL: ws://<host>:8002/ws/dashboard/<tenant_slug>/
"""
import json
import logging

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from rest_framework_simplejwt.tokens import AccessToken

logger = logging.getLogger(__name__)


class DashboardConsumer(AsyncJsonWebsocketConsumer):
    """
    Real-time dashboard consumer.
    Broadcasts: new orders, order updates, alerts, device status changes.
    """

    async def connect(self):
        self.tenant_slug = self.scope['url_route']['kwargs'].get('tenant_slug', '')
        self.group_name = f'dashboard_{self.tenant_slug}'

        # Authenticate via query param token
        query_string = self.scope.get('query_string', b'').decode()
        token = self._extract_token(query_string)

        if not token:
            await self.close(code=4001)
            return

        user = await self._authenticate(token)
        if not user:
            await self.close(code=4001)
            return

        # Verify tenant membership
        is_member = await self._check_membership(user, self.tenant_slug)
        if not is_member:
            await self.close(code=4003)
            return

        self.scope['user'] = user

        # Join tenant group
        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name,
        )
        await self.accept()

        await self.send_json({
            'type': 'connection_established',
            'message': 'Свързан с реално време дашборд.',
        })

    async def disconnect(self, close_code):
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(
                self.group_name,
                self.channel_name,
            )

    async def receive_json(self, content, **kwargs):
        """
        Handle messages from the client (ping/pong, subscribe, etc.).
        """
        msg_type = content.get('type', '')

        if msg_type == 'ping':
            await self.send_json({'type': 'pong'})

    # ─── Event handlers (from channel layer group_send) ───

    async def order_created(self, event):
        await self.send_json({
            'type': 'order_created',
            'data': event['data'],
        })

    async def order_updated(self, event):
        await self.send_json({
            'type': 'order_updated',
            'data': event['data'],
        })

    async def order_voided(self, event):
        await self.send_json({
            'type': 'order_voided',
            'data': event['data'],
        })

    async def shift_opened(self, event):
        await self.send_json({
            'type': 'shift_opened',
            'data': event['data'],
        })

    async def shift_closed(self, event):
        await self.send_json({
            'type': 'shift_closed',
            'data': event['data'],
        })

    async def alert_created(self, event):
        await self.send_json({
            'type': 'alert_created',
            'data': event['data'],
        })

    async def device_status(self, event):
        await self.send_json({
            'type': 'device_status',
            'data': event['data'],
        })

    async def kpi_update(self, event):
        await self.send_json({
            'type': 'kpi_update',
            'data': event['data'],
        })

    # ─── Helpers ───

    def _extract_token(self, query_string: str) -> str:
        """Extract JWT token from query string: ?token=xxx"""
        params = dict(
            part.split('=', 1) for part in query_string.split('&') if '=' in part
        )
        return params.get('token', '')

    @database_sync_to_async
    def _authenticate(self, token_str: str):
        """Validate JWT and return user."""
        from django.contrib.auth import get_user_model
        User = get_user_model()
        try:
            access = AccessToken(token_str)
            user_id = access['user_id']
            return User.objects.get(id=user_id)
        except Exception as e:
            logger.warning(f'WS auth failed: {e}')
            return None

    @database_sync_to_async
    def _check_membership(self, user, tenant_slug: str) -> bool:
        """Check if user belongs to the tenant."""
        from apps.tenants.models import TenantUser
        return TenantUser.objects.filter(
            user=user,
            tenant__slug=tenant_slug,
            is_active=True,
        ).exists()
