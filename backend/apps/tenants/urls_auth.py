"""
Auth URL configuration — JWT login, refresh, logout, device verify.
"""
from django.urls import path

from . import views_auth

urlpatterns = [
    path('login/', views_auth.LoginView.as_view(), name='auth-login'),
    path('refresh/', views_auth.RefreshView.as_view(), name='auth-refresh'),
    path('logout/', views_auth.LogoutView.as_view(), name='auth-logout'),
    path('device/verify/', views_auth.device_verify, name='auth-device-verify'),
]
