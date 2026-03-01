"""
URL configuration for ClovUp project.
"""
from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path('admin/', admin.site.urls),

    # API v1
    path('api/v1/auth/', include('apps.tenants.urls_auth')),
    path('api/v1/tenants/', include('apps.tenants.urls')),
    path('api/v1/catalog/', include('apps.catalog.urls')),
    path('api/v1/clients/', include('apps.clients.urls')),
    path('api/v1/orders/', include('apps.orders.urls')),
    path('api/v1/inventory/', include('apps.inventory.urls')),
    path('api/v1/reports/', include('apps.reports.urls')),
    path('api/v1/fiscal/', include('apps.fiscal.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    try:
        import debug_toolbar
        urlpatterns = [path('__debug__/', include(debug_toolbar.urls))] + urlpatterns
    except ImportError:
        pass
