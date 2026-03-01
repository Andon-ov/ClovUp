from django.urls import path

from . import views

urlpatterns = [
    path('receipt/', views.print_fiscal_receipt, name='fiscal-receipt'),
    path('storno/', views.print_storno_receipt, name='fiscal-storno'),
    path('cash-operation/', views.cash_operation, name='fiscal-cash-operation'),
    path('x-report/', views.x_report, name='fiscal-x-report'),
    path('z-report/', views.z_report, name='fiscal-z-report'),
    path('printer-status/', views.printer_status, name='fiscal-printer-status'),
    path('reprint/', views.reprint_receipt, name='fiscal-reprint'),
    path('callback/', views.device_fiscal_callback, name='fiscal-callback'),
]
