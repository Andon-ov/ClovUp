"""
Auth views — JWT login (with user info), refresh, logout, device verify.
"""
from django.contrib.auth import authenticate
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView

from .models import POSDevice, TenantUser


class LoginView(APIView):
    """
    POST /auth/login/
    Returns JWT tokens + user info (role, full_name).
    """
    permission_classes = [AllowAny]

    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')

        if not username or not password:
            return Response(
                {'error': 'Username and password are required'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = authenticate(username=username, password=password)

        if user is None:
            return Response(
                {'error': 'Invalid credentials'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        try:
            tenant_user = user.tenantuser
        except TenantUser.DoesNotExist:
            return Response(
                {'error': 'User is not assigned to any tenant'},
                status=status.HTTP_403_FORBIDDEN,
            )

        if not tenant_user.is_active:
            return Response(
                {'error': 'User account is deactivated'},
                status=status.HTTP_403_FORBIDDEN,
            )

        refresh = RefreshToken.for_user(user)

        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': {
                'id': user.id,
                'username': user.username,
                'full_name': user.get_full_name(),
                'role': tenant_user.role,
                'tenant_id': tenant_user.tenant_id,
            },
        })


class RefreshView(TokenRefreshView):
    """POST /auth/refresh/ — standard simplejwt refresh."""
    pass


class LogoutView(APIView):
    """
    POST /auth/logout/
    Blacklist the refresh token.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        refresh_token = request.data.get('refresh')
        if not refresh_token:
            return Response(
                {'error': 'Refresh token is required'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            token = RefreshToken(refresh_token)
            token.blacklist()
        except Exception:
            return Response(
                {'error': 'Invalid token'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response({'detail': 'Logged out successfully'})


@api_view(['POST'])
@permission_classes([AllowAny])
def device_verify(request):
    """
    POST /auth/device/verify/
    Validates a Device-Token header and returns device info.
    """
    token = request.headers.get('Device-Token')
    if not token:
        return Response(
            {'error': 'Device-Token header is required'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        device = POSDevice.objects.select_related(
            'location__tenant'
        ).get(api_token=token)
    except POSDevice.DoesNotExist:
        return Response(
            {'error': 'Invalid device token'},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    return Response({
        'device_id': device.id,
        'logical_name': device.logical_name,
        'display_name': device.display_name,
        'location': {
            'id': device.location.id,
            'name': device.location.name,
        },
        'tenant': {
            'id': device.location.tenant.id,
            'name': device.location.tenant.name,
        },
    })
