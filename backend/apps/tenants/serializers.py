"""
Tenant serializers.
"""
from django.contrib.auth.models import User
from rest_framework import serializers

from .models import Location, POSDevice, Tenant, TenantUser


class TenantSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tenant
        fields = ['id', 'name', 'slug', 'tax_number', 'plan', 'is_active', 'created_at']
        read_only_fields = ['id', 'created_at']


class LocationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Location
        fields = [
            'id', 'tenant', 'name', 'address', 'city',
            'object_name', 'created_at',
        ]
        read_only_fields = ['id', 'tenant', 'created_at']


class POSDeviceSerializer(serializers.ModelSerializer):
    location_name = serializers.CharField(source='location.name', read_only=True)

    class Meta:
        model = POSDevice
        fields = [
            'id', 'location', 'location_name', 'logical_name',
            'display_name', 'notes', 'api_token', 'is_online',
            'last_seen_at', 'created_at',
        ]
        read_only_fields = ['id', 'api_token', 'is_online', 'last_seen_at', 'created_at']


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'email']
        read_only_fields = ['id']


class TenantUserSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    full_name = serializers.CharField(source='user.get_full_name', read_only=True)

    class Meta:
        model = TenantUser
        fields = [
            'id', 'user', 'full_name', 'tenant', 'role',
            'card_number', 'is_active', 'locations', 'created_at',
        ]
        read_only_fields = ['id', 'tenant', 'created_at']


class TenantMeSerializer(serializers.Serializer):
    """Response for GET /tenants/me/ — current tenant + user info."""
    tenant = TenantSerializer()
    user = TenantUserSerializer()
