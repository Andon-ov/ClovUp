"""
Catalog filters.
"""
import django_filters

from .models import Product


class ProductFilter(django_filters.FilterSet):
    category = django_filters.NumberFilter(field_name='category_id')
    barcode = django_filters.CharFilter(field_name='barcode', lookup_expr='exact')
    search = django_filters.CharFilter(field_name='name', lookup_expr='icontains')
    is_active = django_filters.BooleanFilter(field_name='is_active')
    vat_group = django_filters.CharFilter(field_name='vat_group')

    class Meta:
        model = Product
        fields = ['category', 'barcode', 'is_active', 'vat_group']
