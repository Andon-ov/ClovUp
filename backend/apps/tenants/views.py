"""
Tenant views.
"""
from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from core.permissions import IsTenantMember, IsOwner

from .models import Location, POSDevice, TenantUser
from .serializers import (
    LocationSerializer,
    POSDeviceSerializer,
    TenantMeSerializer,
    TenantSerializer,
    TenantUserSerializer,
)


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsTenantMember])
def tenant_me(request):
    """GET /tenants/me/ — current tenant + user info."""
    tenant_user = request.user.tenantuser
    data = TenantMeSerializer({
        'tenant': tenant_user.tenant,
        'user': tenant_user,
    }).data
    return Response(data)


class LocationViewSet(viewsets.ModelViewSet):
    serializer_class = LocationSerializer
    permission_classes = [IsAuthenticated, IsTenantMember]

    def get_queryset(self):
        return Location.objects.filter(tenant=self.request.tenant)

    def perform_create(self, serializer):
        serializer.save(tenant=self.request.tenant)


class POSDeviceViewSet(viewsets.ModelViewSet):
    serializer_class = POSDeviceSerializer
    permission_classes = [IsAuthenticated, IsTenantMember]

    def get_queryset(self):
        return POSDevice.objects.filter(
            location__tenant=self.request.tenant
        ).select_related('location')

    def perform_create(self, serializer):
        # Ensure location belongs to tenant
        location = serializer.validated_data['location']
        if location.tenant != self.request.tenant:
            return Response(
                {'error': 'Location does not belong to your tenant'},
                status=status.HTTP_403_FORBIDDEN,
            )
        serializer.save()


class TenantUserViewSet(viewsets.ModelViewSet):
    serializer_class = TenantUserSerializer
    permission_classes = [IsAuthenticated, IsOwner]

    def get_queryset(self):
        return TenantUser.objects.filter(
            tenant=self.request.tenant
        ).select_related('user')
