"""
Orders views.
"""
from decimal import Decimal

from django.db import transaction
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from core.permissions import (
    IsDeviceAuthenticated, IsManagerOrAbove, IsTenantMember,
)
from apps.catalog.models import Product

from .models import Order, OrderItem, Payment, Shift
from .serializers import (
    OrderCreateSerializer,
    OrderItemCreateSerializer,
    OrderSerializer,
    OrderVoidSerializer,
    PaymentCreateSerializer,
    PaymentSerializer,
    ShiftSerializer,
)


class ShiftViewSet(viewsets.ModelViewSet):
    serializer_class = ShiftSerializer
    permission_classes = [IsAuthenticated, IsTenantMember]

    def get_queryset(self):
        return Shift.objects.filter(
            location__tenant=self.request.tenant
        ).select_related('cashier__user', 'device')

    @action(detail=False, methods=['post'], url_path='open')
    def open_shift(self, request):
        """POST /orders/shifts/open/ — open a new shift."""
        serializer = ShiftSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='close')
    def close_shift(self, request, pk=None):
        """POST /orders/shifts/{id}/close/ — close a shift."""
        shift = self.get_object()
        if shift.status == 'CLOSED':
            return Response(
                {'error': 'Shift is already closed'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        shift.status = 'CLOSED'
        shift.closed_at = timezone.now()
        shift.closing_cash = request.data.get('closing_cash', 0)
        shift.notes = request.data.get('notes', shift.notes)
        shift.save()
        return Response(ShiftSerializer(shift).data)


class OrderViewSet(viewsets.ModelViewSet):
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated | IsDeviceAuthenticated]

    def get_queryset(self):
        tenant = self.request.tenant
        if not tenant:
            return Order.objects.none()
        return Order.objects.for_tenant(tenant).select_related(
            'device', 'cashier__user', 'location', 'client_account'
        ).prefetch_related('items', 'payments')

    def create(self, request, *args, **kwargs):
        """
        POST /orders/ — Device-Token auth.
        Idempotent: get_or_create on UUID.
        """
        serializer = OrderCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        device = getattr(request, 'device', None)
        tenant = request.tenant

        # Idempotent check
        existing = Order.objects.filter(uuid=data['uuid']).first()
        if existing:
            return Response(
                OrderSerializer(existing).data,
                status=status.HTTP_200_OK,
            )

        with transaction.atomic():
            # Build order_number
            order_number = f"{device.logical_name}-{data['receipt_sequence']:07d}" if device else f"WEB-{data['receipt_sequence']:07d}"

            # Resolve cashier
            cashier = None
            if hasattr(request, 'user') and request.user.is_authenticated:
                try:
                    cashier = request.user.tenantuser
                except Exception:
                    pass

            order = Order.objects.create(
                uuid=data['uuid'],
                receipt_sequence=data['receipt_sequence'],
                order_number=order_number,
                tenant=tenant,
                location=device.location if device else tenant.locations.first(),
                device=device,
                shift_id=data.get('shift_id'),
                cashier=cashier,
                client_account_id=data.get('client_account_id'),
                order_type=data['order_type'],
                table_number=data.get('table_number'),
                notes=data.get('notes', ''),
            )

            # Create items with product snapshot
            subtotal = Decimal('0')
            for item_data in data['items']:
                product = Product.objects.get(id=item_data['product_id'])
                qty = item_data['quantity']
                discount_pct = item_data.get('discount_pct', 0)
                unit_price = product.price
                line_total = unit_price * qty * Decimal(1 - discount_pct / 100)
                line_total = line_total.quantize(Decimal('0.01'))

                OrderItem.objects.create(
                    order=order,
                    product=product,
                    product_name=product.name,
                    product_price=product.price,
                    vat_group=product.vat_group,
                    cost_price=product.cost_price,
                    quantity=qty,
                    discount_pct=discount_pct,
                    line_total=line_total,
                    notes=item_data.get('notes', ''),
                )
                subtotal += line_total

            order.subtotal = subtotal
            order.total = subtotal
            order.save(update_fields=['subtotal', 'total', 'updated_at'])

        return Response(
            OrderSerializer(order).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=['post'], url_path='payments')
    def add_payment(self, request, pk=None):
        """POST /orders/{id}/payments/ — add payment and mark PAID."""
        order = self.get_object()

        # Idempotent: if already paid, return existing
        if order.status == 'PAID':
            return Response(
                OrderSerializer(order).data,
                status=status.HTTP_200_OK,
            )

        serializer = PaymentCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        device = getattr(request, 'device', None)

        with transaction.atomic():
            payment = Payment.objects.create(
                order=order,
                amount=data['amount'],
                payment_method=data['payment_method'],
                change_given=data.get('change_given', 0),
                client_account_id=data.get('client_account_id'),
                device=device,
                additional_info=data.get('additional_info', ''),
            )

            order.status = 'PAID'
            order.save(update_fields=['status', 'updated_at'])

        return Response(
            OrderSerializer(order).data,
            status=status.HTTP_201_CREATED,
        )

    @action(
        detail=True, methods=['post'], url_path='void',
        permission_classes=[IsAuthenticated, IsTenantMember, IsManagerOrAbove],
    )
    def void_order(self, request, pk=None):
        """POST /orders/{id}/void/ — void an order (MANAGER+ only)."""
        order = self.get_object()

        if order.status == 'VOIDED':
            return Response(
                {'error': 'Order is already voided'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = OrderVoidSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        cashier = None
        if hasattr(request, 'user') and request.user.is_authenticated:
            try:
                cashier = request.user.tenantuser
            except Exception:
                pass

        order.status = 'VOIDED'
        order.voided_at = timezone.now()
        order.voided_by = cashier
        order.void_reason = serializer.validated_data['void_reason']
        order.save(update_fields=[
            'status', 'voided_at', 'voided_by', 'void_reason', 'updated_at'
        ])

        return Response(OrderSerializer(order).data)
