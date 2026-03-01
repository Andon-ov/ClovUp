"""
Clients URL configuration.
"""
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register(r'groups', views.ClientGroupViewSet, basename='clientgroup')
router.register(r'cards', views.CardViewSet, basename='card')
router.register(r'accounts', views.ClientAccountViewSet, basename='clientaccount')
router.register(r'blacklist', views.BlacklistViewSet, basename='blacklist')
router.register(r'spending-limits', views.SpendingLimitViewSet, basename='spendinglimit')
router.register(r'limit-groups', views.LimitClientGroupViewSet, basename='limitclientgroup')
router.register(r'device-groups', views.DeviceClientGroupViewSet, basename='deviceclientgroup')

urlpatterns = [
    path('', include(router.urls)),
]
