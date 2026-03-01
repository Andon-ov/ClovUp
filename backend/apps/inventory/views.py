from django.db import transaction
from django.db.models import F
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from core.permissions import IsTenantMember, IsManagerOrAbove
from .models import Supplier, Stock, StockMovement, Delivery
from .serializers import (
    SupplierSerializer,
    StockSerializer,
    StockMovementSerializer,
    StockAdjustmentSerializer,
    DeliverySerializer,
    DeliveryCreateSerializer,
)


class SupplierViewSet(viewsets.ModelViewSet):
    serializer_class = SupplierSerializer
    permission_classes = [IsAuthenticated, IsTenantMember]

    def get_queryset(self):
        return Supplier.objects.for_tenant(self.request.tenant)

    def perform_create(self, serializer):
        serializer.save(tenant=self.request.tenant)


class StockViewSet(viewsets.ModelViewSet):
    serializer_class = StockSerializer
    permission_classes = [IsAuthenticated, IsTenantMember]

    def get_queryset(self):
        qs = Stock.objects.filter(
            location__tenant=self.request.tenant,
        ).select_related('product', 'location')

        location_id = self.request.query_params.get('location')
        if location_id:
            qs = qs.filter(location_id=location_id)

        return qs

    @action(detail=False, methods=['get'], url_path='low-stock')
    def low_stock(self, request):
        """
        Products where current quantity <= min_quantity.
        """
        qs = self.get_queryset().filter(
            quantity__lte=F('min_quantity'),
            min_quantity__gt=0,
        )
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'], url_path='adjust',
            permission_classes=[IsAuthenticated, IsTenantMember, IsManagerOrAbove])
    def adjust(self, request):
        """
        Manual stock adjustment (waste, correction, return).
        """
        ser = StockAdjustmentSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data

        with transaction.atomic():
            stock, created = Stock.objects.select_for_update().get_or_create(
                location_id=data['location'],
                product_id=data['product'],
                defaults={'quantity': 0},
            )
            stock.quantity = F('quantity') + data['quantity']
            stock.save(update_fields=['quantity'])

            StockMovement.objects.create(
                location_id=data['location'],
                product_id=data['product'],
                movement_type=data['movement_type'],
                quantity=data['quantity'],
                notes=data.get('notes', ''),
            )

        stock.refresh_from_db()
        return Response(StockSerializer(stock).data, status=status.HTTP_200_OK)


class StockMovementViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = StockMovementSerializer
    permission_classes = [IsAuthenticated, IsTenantMember]

    def get_queryset(self):
        qs = StockMovement.objects.filter(
            location__tenant=self.request.tenant,
        ).select_related('product', 'location')

        location_id = self.request.query_params.get('location')
        if location_id:
            qs = qs.filter(location_id=location_id)

        product_id = self.request.query_params.get('product')
        if product_id:
            qs = qs.filter(product_id=product_id)

        movement_type = self.request.query_params.get('type')
        if movement_type:
            qs = qs.filter(movement_type=movement_type)

        return qs


class DeliveryViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsTenantMember]

    def get_queryset(self):
        return Delivery.objects.for_tenant(
            self.request.tenant,
        ).select_related('supplier', 'location').prefetch_related('items__product')

    def get_serializer_class(self):
        if self.action == 'create':
            return DeliveryCreateSerializer
        return DeliverySerializer

    def perform_create(self, serializer):
        serializer.save(tenant=self.request.tenant)

    @action(detail=True, methods=['post'], url_path='receive',
            permission_classes=[IsAuthenticated, IsTenantMember, IsManagerOrAbove])
    def receive(self, request, pk=None):
        """
        Mark delivery as received — updates stock and creates movements.
        """
        delivery = self.get_object()
        if delivery.status == 'RECEIVED':
            return Response(
                {'detail': 'Доставката вече е получена.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            delivery.status = 'RECEIVED'
            delivery.received_at = timezone.now()
            delivery.received_by = request.user
            delivery.save(update_fields=['status', 'received_at', 'received_by'])

            for item in delivery.items.all():
                stock, _ = Stock.objects.select_for_update().get_or_create(
                    location=delivery.location,
                    product=item.product,
                    defaults={'quantity': 0},
                )
                stock.quantity = F('quantity') + item.quantity
                stock.save(update_fields=['quantity'])

                StockMovement.objects.create(
                    location=delivery.location,
                    product=item.product,
                    movement_type='DELIVERY',
                    quantity=item.quantity,
                    cost_price=item.unit_price,
                    reference_id=str(delivery.id),
                    notes=f'Доставка #{delivery.id}',
                )

        delivery.refresh_from_db()
        return Response(DeliverySerializer(delivery).data)
