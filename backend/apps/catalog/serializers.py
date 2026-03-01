"""
Catalog serializers.
"""
from rest_framework import serializers

from .models import PriceList, PriceListItem, Product, ProductCategory, ProductLimit


class ProductCategorySerializer(serializers.ModelSerializer):
    children = serializers.SerializerMethodField()

    class Meta:
        model = ProductCategory
        fields = ['id', 'name', 'parent', 'color', 'legacy_id', 'children']
        read_only_fields = ['id']

    def get_children(self, obj):
        children = obj.get_children()
        return ProductCategorySerializer(children, many=True).data


class ProductSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(
        source='category.name', read_only=True, default=None
    )

    class Meta:
        model = Product
        fields = [
            'id', 'category', 'category_name', 'name', 'barcode', 'sku',
            'unit', 'vat_group', 'price', 'cost_price', 'max_discount_pct',
            'is_active', 'is_deleted', 'image', 'legacy_id',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'is_deleted', 'created_at', 'updated_at']


class ProductSearchSerializer(serializers.ModelSerializer):
    """Lightweight serializer for barcode/name search."""
    class Meta:
        model = Product
        fields = ['id', 'name', 'barcode', 'price', 'vat_group', 'unit', 'image']


class PriceListSerializer(serializers.ModelSerializer):
    class Meta:
        model = PriceList
        fields = ['id', 'name', 'valid_from', 'valid_to', 'created_at']
        read_only_fields = ['id', 'created_at']


class PriceListItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)

    class Meta:
        model = PriceListItem
        fields = ['id', 'price_list', 'product', 'product_name', 'price']
        read_only_fields = ['id']


class ProductLimitSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductLimit
        fields = ['id', 'product', 'device', 'max_discount']
        read_only_fields = ['id']
