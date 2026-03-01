"""
Tenant admin configuration.
"""
from django.contrib import admin

from .models import Location, POSDevice, Tenant, TenantUser


@admin.register(Tenant)
class TenantAdmin(admin.ModelAdmin):
    list_display = ['name', 'slug', 'tax_number', 'plan', 'is_active']
    list_filter = ['plan', 'is_active']
    search_fields = ['name', 'tax_number']
    prepopulated_fields = {'slug': ('name',)}


@admin.register(Location)
class LocationAdmin(admin.ModelAdmin):
    list_display = ['name', 'tenant', 'city', 'object_name']
    list_filter = ['tenant', 'city']
    search_fields = ['name', 'address']


@admin.register(POSDevice)
class POSDeviceAdmin(admin.ModelAdmin):
    list_display = ['display_name', 'logical_name', 'location', 'is_online', 'last_seen_at']
    list_filter = ['is_online', 'location__tenant']
    readonly_fields = ['api_token']


@admin.register(TenantUser)
class TenantUserAdmin(admin.ModelAdmin):
    list_display = ['user', 'tenant', 'role', 'is_active']
    list_filter = ['role', 'is_active', 'tenant']
    search_fields = ['user__first_name', 'user__last_name', 'user__username']
