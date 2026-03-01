"""
Fiscal serializers — request/response validation for fiscal endpoints.
"""
from rest_framework import serializers


class FiscalReceiptRequestSerializer(serializers.Serializer):
    order_id = serializers.IntegerField()


class StornoReceiptRequestSerializer(serializers.Serializer):
    order_id = serializers.IntegerField()
    reason = serializers.CharField(default='Връщане на стока')
    storno_type = serializers.ChoiceField(
        choices=['OPERATOR_ERROR', 'REFUND', 'TAX_REDUCTION'],
        default='OPERATOR_ERROR',
    )


class CashOperationRequestSerializer(serializers.Serializer):
    operation_type = serializers.ChoiceField(choices=['SERVICE_IN', 'SERVICE_OUT'])
    amount = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=0.01)
    notes = serializers.CharField(required=False, default='', allow_blank=True)
    device_id = serializers.IntegerField()


class XReportRequestSerializer(serializers.Serializer):
    device_id = serializers.IntegerField()


class ZReportRequestSerializer(serializers.Serializer):
    device_id = serializers.IntegerField()


class ReprintRequestSerializer(serializers.Serializer):
    receipt_id = serializers.IntegerField()


class DeviceCallbackSerializer(serializers.Serializer):
    idempotency_key = serializers.CharField()
    receipt_number = serializers.CharField(required=False, default='')
    fiscal_memory = serializers.CharField(required=False, default='')
    device_serial = serializers.CharField(required=False, default='')
    success = serializers.BooleanField(default=False)
    raw_response = serializers.DictField(required=False, default=dict)
    error = serializers.CharField(required=False, allow_null=True, default=None)


class FiscalReceiptResponseSerializer(serializers.Serializer):
    fiscal_receipt_id = serializers.IntegerField()
    status = serializers.CharField()
    receipt_number = serializers.CharField(required=False)
    message = serializers.CharField(required=False)
