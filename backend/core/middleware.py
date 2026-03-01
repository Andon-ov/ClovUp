"""
Core middleware for ClovUp.
TenantMiddleware — attaches tenant to request for JWT-authenticated users.
AuditMiddleware — logs write operations to AuditLog.
"""
import json
import logging

from django.utils.deprecation import MiddlewareMixin

logger = logging.getLogger(__name__)


class TenantMiddleware(MiddlewareMixin):
    """
    Attaches request.tenant for authenticated users.
    For Device-Token auth, the tenant is set by IsDeviceAuthenticated permission.
    For JWT auth, the tenant is resolved from TenantUser.
    """

    def process_request(self, request):
        request.tenant = None

        if hasattr(request, 'user') and request.user.is_authenticated:
            try:
                tenant_user = request.user.tenantuser
                request.tenant = tenant_user.tenant
            except Exception:
                pass


class AuditMiddleware(MiddlewareMixin):
    """
    Automatically logs write operations (POST, PUT, PATCH, DELETE) to AuditLog.
    This is a business practice for internal control and ДОПК чл. 38 compliance.
    """

    AUDIT_METHODS = ('POST', 'PUT', 'PATCH', 'DELETE')

    def process_response(self, request, response):
        if request.method not in self.AUDIT_METHODS:
            return response

        if not hasattr(request, 'tenant') or request.tenant is None:
            return response

        if response.status_code >= 400:
            return response

        # Skip admin and auth endpoints from audit
        path = request.path
        if path.startswith('/admin/') or path.startswith('/api/v1/auth/'):
            return response

        try:
            from apps.tenants.models import TenantUser
            from apps.orders.models import AuditLog

            user_tenant = None
            if hasattr(request, 'user') and request.user.is_authenticated:
                try:
                    user_tenant = request.user.tenantuser
                except TenantUser.DoesNotExist:
                    pass

            # Determine action from HTTP method
            action_map = {
                'POST': 'CREATE',
                'PUT': 'UPDATE',
                'PATCH': 'UPDATE',
                'DELETE': 'DELETE',
            }
            action = action_map.get(request.method, 'UNKNOWN')

            # Try to get response data
            changes = {}
            try:
                if hasattr(response, 'data') and response.data:
                    changes = {'response': str(response.data)[:500]}
            except Exception:
                pass

            device = getattr(request, 'device', None)

            AuditLog.objects.create(
                tenant=request.tenant,
                user=user_tenant,
                action=action,
                model_name=_extract_model_name(path),
                object_id=_extract_object_id(path),
                changes=changes,
                ip_address=_get_client_ip(request),
                device=device,
            )
        except Exception as e:
            logger.warning(f'AuditMiddleware error: {e}')

        return response


def _extract_model_name(path: str) -> str:
    """Extract model name from URL path."""
    parts = [p for p in path.strip('/').split('/') if p]
    # /api/v1/catalog/products/1/ → 'products'
    if len(parts) >= 3:
        return parts[2]  # e.g., 'products', 'orders', 'accounts'
    return 'unknown'


def _extract_object_id(path: str) -> str:
    """Extract object ID from URL path."""
    parts = [p for p in path.strip('/').split('/') if p]
    # /api/v1/catalog/products/42/ → '42'
    if len(parts) >= 4:
        try:
            return parts[3]
        except (IndexError, ValueError):
            pass
    return ''


def _get_client_ip(request) -> str:
    """Get client IP from request."""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        return x_forwarded_for.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR', '')
