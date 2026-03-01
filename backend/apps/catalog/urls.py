"""
Catalog URL configuration.
"""
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register(r'categories', views.ProductCategoryViewSet, basename='category')
router.register(r'products', views.ProductViewSet, basename='product')
router.register(r'pricelists', views.PriceListViewSet, basename='pricelist')
router.register(r'pricelist-items', views.PriceListItemViewSet, basename='pricelistitem')
router.register(r'product-limits', views.ProductLimitViewSet, basename='productlimit')

urlpatterns = [
    path('', include(router.urls)),
]
