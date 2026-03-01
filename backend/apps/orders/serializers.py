"""
Orders serializers.
"""
from rest_framework import serializers

from .models import (
    AuditLog, CashOperation, DailyZReport, FiscalReceipt,
    Order, OrderItem, Payment, Shift,
)


class ShiftSerializer(serializers.ModelSerializer):
    cashier_name = serializers.CharField(
        source='cashier.user.get_full_name', read_only=True
    )

    class Meta:
        model = Shift
        fields = [
            'id', 'location', 'device', 'cashier', 'cashier_name',
            'opened_at', 'closed_at', 'opening_cash', 'closing_cash',
            'status', 'notes', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']


class OrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = [
            'id', 'product', 'product_name', 'product_price',
            'vat_group', 'cost_price', 'quantity', 'discount_pct',
            'line_total', 'notes',
        ]
        read_only_fields = ['id']


class OrderItemCreateSerializer(serializers.Serializer):
    """Used when creating an order — looks up product and snapshots data."""
    product_id = serializers.IntegerField()
    quantity = serializers.DecimalField(max_digits=10, decimal_places=3)
    discount_pct = serializers.FloatField(default=0)
    notes = serializers.CharField(required=False, default='')


class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = [
            'id', 'order', 'client_account', 'paid_at', 'amount',
            'payment_method', 'change_given', 'device',
            'additional_info', 'created_at',
        ]
        read_only_fields = ['id', 'paid_at', 'created_at']


class PaymentCreateSerializer(serializers.Serializer):
    """Used when adding a payment to an order."""
    amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    payment_method = serializers.ChoiceField(
        choices=['CASH', 'CARD', 'CHEQUE', 'VOUCHER', 'COUPON',
                 'DIGITAL', 'ACCOUNT', 'MIXED']
    )
    change_given = serializers.DecimalField(
        max_digits=10, decimal_places=2, default=0
    )
    client_account_id = serializers.IntegerField(required=False, default=None)
    additional_info = serializers.CharField(required=False, default='')


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    payments = PaymentSerializer(many=True, read_only=True)
    cashier_name = serializers.CharField(
        source='cashier.user.get_full_name', read_only=True, default=None
    )

    class Meta:
        model = Order
        fields = [
            'id', 'uuid', 'receipt_sequence', 'order_number',
            'tenant', 'location', 'device', 'shift', 'cashier',
            'cashier_name', 'client_account', 'status', 'order_type',
            'table_number', 'subtotal', 'discount', 'total', 'notes',
            'refund_order', 'voided_at', 'voided_by', 'void_reason',
            'items', 'payments', 'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'uuid', 'order_number', 'tenant', 'subtotal',
            'discount', 'total', 'voided_at', 'voided_by',
            'created_at', 'updated_at',
        ]


class OrderCreateSerializer(serializers.Serializer):
    """Used by Device-Token auth to create an order."""
    uuid = serializers.UUIDField()
    receipt_sequence = serializers.IntegerField()
    order_type = serializers.ChoiceField(
        choices=['DINE_IN', 'TAKEAWAY', 'DELIVERY', 'RETAIL']
    )
    table_number = serializers.CharField(required=False, default=None)
    shift_id = serializers.IntegerField(required=False, default=None)
    client_account_id = serializers.IntegerField(required=False, default=None)
    notes = serializers.CharField(required=False, default='')
    items = OrderItemCreateSerializer(many=True)


class OrderVoidSerializer(serializers.Serializer):
    """Used to void an order."""
    void_reason = serializers.CharField()


class FiscalReceiptSerializer(serializers.ModelSerializer):
    class Meta:
        model = FiscalReceipt
        fields = [
            'id', 'order', 'receipt_number', 'fiscal_memory',
            'device_serial', 'printed_at', 'raw_response', 'status',
            'idempotency_key', 'is_storno', 'storno_of', 'storno_type',
            'storno_reason', 'initiated_by', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']


class AuditLogSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(
        source='user.user.get_full_name', read_only=True, default=None
    )

    class Meta:
        model = AuditLog
        fields = [
            'id', 'tenant', 'user', 'user_name', 'action',
            'model_name', 'object_id', 'changes', 'ip_address',
            'device', 'created_at',
        ]
        read_only_fields = fields


class DailyZReportSerializer(serializers.ModelSerializer):
    location_name = serializers.CharField(
        source='location.name', read_only=True
    )

    class Meta:
        model = DailyZReport
        fields = [
            'id', 'location', 'location_name', 'date',
            'expected_total', 'fiscal_total', 'difference',
            'status', 'closed_by', 'closed_at', 'fiscal_response',
            'created_at',
        ]
        read_only_fields = fields
