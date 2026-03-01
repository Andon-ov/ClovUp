from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import SupplierViewSet, StockViewSet, StockMovementViewSet, DeliveryViewSet

router = DefaultRouter()
router.register(r'suppliers', SupplierViewSet, basename='supplier')
router.register(r'stock', StockViewSet, basename='stock')
router.register(r'movements', StockMovementViewSet, basename='stock-movement')
router.register(r'deliveries', DeliveryViewSet, basename='delivery')

urlpatterns = [
    path('', include(router.urls)),
]
