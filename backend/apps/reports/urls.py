from django.urls import path

from . import views

urlpatterns = [
    path('dashboard/', views.dashboard_kpis, name='report-dashboard'),
    path('sales/', views.sales_by_date, name='report-sales'),
    path('hourly/', views.sales_by_hour, name='report-hourly'),
    path('top-products/', views.top_products, name='report-top-products'),
    path('vat/', views.vat_breakdown, name='report-vat'),
    path('payments/', views.payment_breakdown, name='report-payments'),
    path('z-reports/', views.z_report_history, name='report-z-reports'),
    path('shifts/', views.shift_report, name='report-shifts'),
    path('export/csv/', views.export_sales_csv, name='report-export-csv'),
    path('export/excel/', views.export_sales_excel, name='report-export-excel'),
]
