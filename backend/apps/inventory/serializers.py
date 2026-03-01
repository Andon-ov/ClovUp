from rest_framework import serializers

from .models import Supplier, Stock, StockMovement, Delivery, DeliveryItem


class SupplierSerializer(serializers.ModelSerializer):
    class Meta:
        model = Supplier
        fields = [
            'id', 'name', 'company_name', 'tax_number', 'vat_number',
            'contact_person', 'phone', 'email', 'address', 'notes', 'is_active',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class StockSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_barcode = serializers.CharField(source='product.barcode', read_only=True)
    location_name = serializers.CharField(source='location.name', read_only=True)

    class Meta:
        model = Stock
        fields = [
            'id', 'location', 'location_name', 'product', 'product_name',
            'product_barcode', 'quantity', 'min_quantity',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class StockMovementSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    location_name = serializers.CharField(source='location.name', read_only=True)
    movement_type_display = serializers.CharField(
        source='get_movement_type_display', read_only=True,
    )

    class Meta:
        model = StockMovement
        fields = [
            'id', 'location', 'location_name', 'product', 'product_name',
            'movement_type', 'movement_type_display', 'quantity',
            'cost_price', 'reference_id', 'notes', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']


class StockAdjustmentSerializer(serializers.Serializer):
    """
    For manual stock adjustments (waste, correction, etc.).
    """
    product = serializers.IntegerField()
    location = serializers.IntegerField()
    quantity = serializers.DecimalField(max_digits=12, decimal_places=3)
    movement_type = serializers.ChoiceField(
        choices=['ADJUSTMENT', 'WASTE', 'RETURN'],
    )
    notes = serializers.CharField(required=False, default='')


class DeliveryItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)

    class Meta:
        model = DeliveryItem
        fields = [
            'id', 'product', 'product_name', 'quantity',
            'unit_price', 'total_price',
        ]
        read_only_fields = ['id', 'total_price']


class DeliveryItemCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = DeliveryItem
        fields = ['product', 'quantity', 'unit_price']


class DeliverySerializer(serializers.ModelSerializer):
    items = DeliveryItemSerializer(many=True, read_only=True)
    supplier_name = serializers.CharField(source='supplier.name', read_only=True)
    location_name = serializers.CharField(source='location.name', read_only=True)

    class Meta:
        model = Delivery
        fields = [
            'id', 'location', 'location_name', 'supplier', 'supplier_name',
            'document_number', 'status', 'total_amount', 'notes',
            'received_at', 'received_by', 'items',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'total_amount', 'received_at', 'received_by',
            'created_at', 'updated_at',
        ]


class DeliveryCreateSerializer(serializers.ModelSerializer):
    items = DeliveryItemCreateSerializer(many=True)

    class Meta:
        model = Delivery
        fields = ['location', 'supplier', 'document_number', 'notes', 'items']

    def create(self, validated_data):
        items_data = validated_data.pop('items')
        delivery = Delivery.objects.create(**validated_data)
        total = 0
        for item_data in items_data:
            item = DeliveryItem.objects.create(delivery=delivery, **item_data)
            total += item.total_price
        delivery.total_amount = total
        delivery.save(update_fields=['total_amount'])
        return delivery
