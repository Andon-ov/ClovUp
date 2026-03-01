from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import ShiftViewSet, OrderViewSet

router = DefaultRouter()
router.register(r'shifts', ShiftViewSet, basename='shift')
router.register(r'orders', OrderViewSet, basename='order')

urlpatterns = [
    path('', include(router.urls)),
]
