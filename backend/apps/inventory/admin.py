from django.contrib import admin
from .models import Supplier, Stock, StockMovement, Delivery, DeliveryItem


class DeliveryItemInline(admin.TabularInline):
    model = DeliveryItem
    extra = 0


@admin.register(Supplier)
class SupplierAdmin(admin.ModelAdmin):
    list_display = ['name', 'company_name', 'phone', 'is_active', 'tenant']
    list_filter = ['is_active', 'tenant']
    search_fields = ['name', 'company_name', 'tax_number']


@admin.register(Stock)
class StockAdmin(admin.ModelAdmin):
    list_display = ['product', 'location', 'quantity', 'min_quantity']
    list_filter = ['location']
    search_fields = ['product__name']


@admin.register(StockMovement)
class StockMovementAdmin(admin.ModelAdmin):
    list_display = ['product', 'location', 'movement_type', 'quantity', 'created_at']
    list_filter = ['movement_type', 'location']
    search_fields = ['product__name']
    readonly_fields = ['created_at']


@admin.register(Delivery)
class DeliveryAdmin(admin.ModelAdmin):
    list_display = ['id', 'supplier', 'location', 'status', 'total_amount', 'received_at']
    list_filter = ['status', 'location']
    inlines = [DeliveryItemInline]
