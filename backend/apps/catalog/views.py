"""
Catalog views.
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from core.permissions import IsTenantMember

from .filters import ProductFilter
from .models import PriceList, PriceListItem, Product, ProductCategory, ProductLimit
from .serializers import (
    PriceListItemSerializer,
    PriceListSerializer,
    ProductCategorySerializer,
    ProductLimitSerializer,
    ProductSearchSerializer,
    ProductSerializer,
)


class ProductCategoryViewSet(viewsets.ModelViewSet):
    serializer_class = ProductCategorySerializer
    permission_classes = [IsAuthenticated, IsTenantMember]
    pagination_class = None  # Categories are few — no need for pagination

    def get_queryset(self):
        return ProductCategory.objects.for_tenant(
            self.request.tenant
        ).filter(level=0)  # Only root nodes; children are nested

    def perform_create(self, serializer):
        serializer.save(tenant=self.request.tenant)


class ProductViewSet(viewsets.ModelViewSet):
    serializer_class = ProductSerializer
    permission_classes = [IsAuthenticated, IsTenantMember]
    filterset_class = ProductFilter
    search_fields = ['name', 'barcode', 'sku']
    ordering_fields = ['name', 'price', 'created_at']

    def get_queryset(self):
        return Product.objects.for_tenant(
            self.request.tenant
        ).filter(is_deleted=False).select_related('category')

    def perform_create(self, serializer):
        serializer.save(tenant=self.request.tenant)

    def perform_destroy(self, instance):
        """Soft delete — mark as deleted, don't actually remove."""
        instance.is_deleted = True
        instance.is_active = False
        instance.save(update_fields=['is_deleted', 'is_active', 'updated_at'])

    @action(detail=False, methods=['get'], url_path='search')
    def search(self, request):
        """GET /catalog/products/search/?barcode=&search="""
        queryset = self.get_queryset()

        barcode = request.query_params.get('barcode')
        search = request.query_params.get('search')

        if barcode:
            queryset = queryset.filter(barcode=barcode)
        elif search:
            queryset = queryset.filter(name__icontains=search)
        else:
            return Response([])

        serializer = ProductSearchSerializer(queryset[:20], many=True)
        return Response(serializer.data)


class PriceListViewSet(viewsets.ModelViewSet):
    serializer_class = PriceListSerializer
    permission_classes = [IsAuthenticated, IsTenantMember]

    def get_queryset(self):
        return PriceList.objects.for_tenant(self.request.tenant)

    def perform_create(self, serializer):
        serializer.save(tenant=self.request.tenant)


class PriceListItemViewSet(viewsets.ModelViewSet):
    serializer_class = PriceListItemSerializer
    permission_classes = [IsAuthenticated, IsTenantMember]

    def get_queryset(self):
        qs = PriceListItem.objects.filter(
            price_list__tenant=self.request.tenant
        ).select_related('product', 'price_list')
        price_list_id = self.request.query_params.get('price_list')
        if price_list_id:
            qs = qs.filter(price_list_id=price_list_id)
        return qs


class ProductLimitViewSet(viewsets.ModelViewSet):
    serializer_class = ProductLimitSerializer
    permission_classes = [IsAuthenticated, IsTenantMember]

    def get_queryset(self):
        return ProductLimit.objects.filter(
            product__tenant=self.request.tenant
        ).select_related('product', 'device')
