"""
Tenant URL configuration.
"""
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register(r'locations', views.LocationViewSet, basename='location')
router.register(r'devices', views.POSDeviceViewSet, basename='device')
router.register(r'users', views.TenantUserViewSet, basename='tenantuser')

urlpatterns = [
    path('me/', views.tenant_me, name='tenant-me'),
    path('', include(router.urls)),
]
