"""
Core permissions for ClovUp.
"""
from rest_framework.permissions import BasePermission


class IsTenantMember(BasePermission):
    """
    Allow access only to authenticated users who belong to a tenant.
    """
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and hasattr(request.user, 'tenantuser')
            and request.user.tenantuser.is_active
        )


class IsDeviceAuthenticated(BasePermission):
    """
    Allow access via Device-Token header.
    Sets request.device and request.tenant on success.
    """
    def has_permission(self, request, view):
        from apps.tenants.models import POSDevice

        token = request.headers.get('Device-Token')
        if not token:
            return False
        try:
            device = POSDevice.objects.select_related(
                'location__tenant'
            ).get(api_token=token)
            request.device = device
            request.tenant = device.location.tenant
            return True
        except POSDevice.DoesNotExist:
            return False


class HasRole(BasePermission):
    """
    Check if user has one of the allowed roles.
    Usage in view: permission_classes = [HasRole]
                   allowed_roles = ['OWNER', 'MANAGER']
    """
    def has_permission(self, request, view):
        if not hasattr(request.user, 'tenantuser'):
            return False
        allowed_roles = getattr(view, 'allowed_roles', [])
        if not allowed_roles:
            return True
        return request.user.tenantuser.role in allowed_roles


class IsOwner(BasePermission):
    """Only OWNER role."""
    def has_permission(self, request, view):
        return (
            hasattr(request.user, 'tenantuser')
            and request.user.tenantuser.role == 'OWNER'
        )


class IsManagerOrAbove(BasePermission):
    """OWNER or MANAGER role."""
    def has_permission(self, request, view):
        return (
            hasattr(request.user, 'tenantuser')
            and request.user.tenantuser.role in ('OWNER', 'MANAGER')
        )


class IsReadOnly(BasePermission):
    """Allow only safe methods (GET, HEAD, OPTIONS)."""
    def has_permission(self, request, view):
        return request.method in ('GET', 'HEAD', 'OPTIONS')
