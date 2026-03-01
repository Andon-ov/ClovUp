"""
Clients views.
"""
from decimal import Decimal

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from core.permissions import IsTenantMember

from .models import Blacklist, Card, ClientAccount, ClientGroup, DeviceClientGroup, LimitClientGroup, SpendingLimit
from .serializers import (
    BlacklistSerializer,
    CardSerializer,
    ClientAccountSerializer,
    ClientGroupSerializer,
    DeviceClientGroupSerializer,
    LimitClientGroupSerializer,
    SpendingLimitSerializer,
    TopUpSerializer,
)


class ClientGroupViewSet(viewsets.ModelViewSet):
    serializer_class = ClientGroupSerializer
    permission_classes = [IsAuthenticated, IsTenantMember]

    def get_queryset(self):
        return ClientGroup.objects.for_tenant(self.request.tenant)

    def perform_create(self, serializer):
        serializer.save(tenant=self.request.tenant)


class CardViewSet(viewsets.ModelViewSet):
    serializer_class = CardSerializer
    permission_classes = [IsAuthenticated, IsTenantMember]

    def get_queryset(self):
        return Card.objects.for_tenant(self.request.tenant)

    def perform_create(self, serializer):
        serializer.save(tenant=self.request.tenant)


class ClientAccountViewSet(viewsets.ModelViewSet):
    serializer_class = ClientAccountSerializer
    permission_classes = [IsAuthenticated, IsTenantMember]

    def get_queryset(self):
        return ClientAccount.objects.for_tenant(
            self.request.tenant
        ).select_related('card', 'client_group')

    def perform_create(self, serializer):
        serializer.save(tenant=self.request.tenant)

    @action(detail=True, methods=['post'], url_path='topup')
    def topup(self, request, pk=None):
        """POST /clients/accounts/{id}/topup/ — зареждане на баланс."""
        account = self.get_object()
        serializer = TopUpSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        amount = serializer.validated_data['amount']
        account.balance_1 += amount
        account.save(update_fields=['balance_1', 'updated_at'])

        return Response(ClientAccountSerializer(account).data)

    @action(detail=True, methods=['post'], url_path='block')
    def block(self, request, pk=None):
        """POST /clients/accounts/{id}/block/ — блокиране."""
        account = self.get_object()
        account.is_blocked = True
        account.save(update_fields=['is_blocked', 'updated_at'])
        return Response(ClientAccountSerializer(account).data)


class BlacklistViewSet(viewsets.ModelViewSet):
    serializer_class = BlacklistSerializer
    permission_classes = [IsAuthenticated, IsTenantMember]
    http_method_names = ['get', 'post', 'head', 'options']

    def get_queryset(self):
        return Blacklist.objects.for_tenant(self.request.tenant)

    def perform_create(self, serializer):
        serializer.save(tenant=self.request.tenant)


class SpendingLimitViewSet(viewsets.ModelViewSet):
    serializer_class = SpendingLimitSerializer
    permission_classes = [IsAuthenticated, IsTenantMember]

    def get_queryset(self):
        return SpendingLimit.objects.for_tenant(self.request.tenant)

    def perform_create(self, serializer):
        serializer.save(tenant=self.request.tenant)


class LimitClientGroupViewSet(viewsets.ModelViewSet):
    serializer_class = LimitClientGroupSerializer
    permission_classes = [IsAuthenticated, IsTenantMember]

    def get_queryset(self):
        return LimitClientGroup.objects.filter(
            client_group__tenant=self.request.tenant
        ).select_related('client_group', 'limit')


class DeviceClientGroupViewSet(viewsets.ModelViewSet):
    serializer_class = DeviceClientGroupSerializer
    permission_classes = [IsAuthenticated, IsTenantMember]

    def get_queryset(self):
        return DeviceClientGroup.objects.filter(
            client_group__tenant=self.request.tenant
        ).select_related('device', 'client_group')
