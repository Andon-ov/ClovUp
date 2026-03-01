"""
Clients serializers.
"""
from rest_framework import serializers

from .models import Blacklist, Card, ClientAccount, ClientGroup, DeviceClientGroup, LimitClientGroup, SpendingLimit


class ClientGroupSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClientGroup
        fields = '__all__'
        read_only_fields = ['id', 'tenant', 'created_at', 'updated_at']


class CardSerializer(serializers.ModelSerializer):
    class Meta:
        model = Card
        fields = ['id', 'physical_number', 'logical_number', 'created_by', 'created_at']
        read_only_fields = ['id', 'created_at']


class ClientAccountSerializer(serializers.ModelSerializer):
    group_name = serializers.CharField(
        source='client_group.name', read_only=True, default=None
    )
    card_number = serializers.CharField(
        source='card.physical_number', read_only=True, default=None
    )

    class Meta:
        model = ClientAccount
        fields = [
            'id', 'name', 'notes', 'is_blocked', 'card', 'card_number',
            'client_group', 'group_name', 'company_name',
            'balance_1', 'balance_2', 'accumulated_1', 'accumulated_2',
            'base_amount', 'legacy_id', 'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'balance_1', 'balance_2',
            'accumulated_1', 'accumulated_2', 'created_at', 'updated_at',
        ]


class TopUpSerializer(serializers.Serializer):
    amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    notes = serializers.CharField(required=False, default='')


class SpendingLimitSerializer(serializers.ModelSerializer):
    class Meta:
        model = SpendingLimit
        fields = '__all__'
        read_only_fields = ['id', 'tenant', 'created_at', 'updated_at']


class BlacklistSerializer(serializers.ModelSerializer):
    class Meta:
        model = Blacklist
        fields = ['id', 'card_number', 'customer_number', 'amount', 'blocked_at', 'created_at']
        read_only_fields = ['id', 'created_at']


class LimitClientGroupSerializer(serializers.ModelSerializer):
    group_name = serializers.CharField(source='client_group.name', read_only=True)
    limit_name = serializers.CharField(source='limit.name', read_only=True)

    class Meta:
        model = LimitClientGroup
        fields = ['id', 'client_group', 'group_name', 'limit', 'limit_name']
        read_only_fields = ['id']


class DeviceClientGroupSerializer(serializers.ModelSerializer):
    device_name = serializers.CharField(source='device.display_name', read_only=True)
    group_name = serializers.CharField(source='client_group.name', read_only=True)

    class Meta:
        model = DeviceClientGroup
        fields = ['id', 'device', 'device_name', 'client_group', 'group_name', 'fiscal_mode']
        read_only_fields = ['id']
