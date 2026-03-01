"""
Tenant models — Tenant, Location, TenantUser, POSDevice.
"""
import uuid

from django.conf import settings
from django.db import models

from core.models import TimestampedModel


class Tenant(TimestampedModel):
    """
    Представлява фирма/бизнес.
    При self-hosted инсталация обикновено има само 1 тенант.
    """
    PLAN_CHOICES = [
        ('FREE', 'Free'),
        ('BASIC', 'Basic'),
        ('PRO', 'Pro'),
    ]

    name = models.CharField(max_length=200, verbose_name='Име на фирмата')
    slug = models.SlugField(unique=True)
    tax_number = models.CharField(max_length=20, verbose_name='ЕИК')
    plan = models.CharField(max_length=10, choices=PLAN_CHOICES, default='FREE')
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class Location(TimestampedModel):
    """
    Физически обект / локация на тенанта.
    """
    tenant = models.ForeignKey(
        Tenant, on_delete=models.CASCADE, related_name='locations'
    )
    name = models.CharField(max_length=200, verbose_name='Обект София център')
    address = models.TextField(verbose_name='Адрес')
    city = models.CharField(max_length=100, verbose_name='Град')
    object_name = models.CharField(
        max_length=50, verbose_name='Кратко име за принтера'
    )

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f'{self.name} ({self.tenant.name})'


class POSDevice(TimestampedModel):
    """
    POS устройство (каса).
    """
    location = models.ForeignKey(
        Location, on_delete=models.CASCADE, related_name='devices'
    )
    logical_name = models.CharField(
        max_length=50, verbose_name='КАСА_1'
    )
    display_name = models.CharField(
        max_length=100, verbose_name='Каса 1 - Зала'
    )
    notes = models.TextField(blank=True)
    api_token = models.UUIDField(
        default=uuid.uuid4, unique=True, editable=False
    )
    is_online = models.BooleanField(default=False)
    last_seen_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['logical_name']

    def __str__(self):
        return f'{self.display_name} @ {self.location.name}'


class TenantUser(TimestampedModel):
    """
    Връзка между Django User и Tenant с роля.
    """
    ROLE_CHOICES = [
        ('OWNER', 'Собственик'),
        ('MANAGER', 'Мениджър'),
        ('CASHIER', 'Касиер'),
        ('ACCOUNTANT', 'Счетоводител'),
        ('AUDITOR', 'Одитор'),
    ]

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name='tenantuser'
    )
    tenant = models.ForeignKey(
        Tenant, on_delete=models.CASCADE, related_name='users'
    )
    role = models.CharField(max_length=15, choices=ROLE_CHOICES)
    card_number = models.CharField(
        max_length=50, blank=True, verbose_name='Карта за идентификация'
    )
    pin_hash = models.CharField(
        max_length=128, blank=True, verbose_name='PIN за вход на каса'
    )
    is_active = models.BooleanField(default=True)
    locations = models.ManyToManyField(
        Location, blank=True, related_name='staff',
        verbose_name='Достъп до обекти'
    )

    class Meta:
        ordering = ['user__first_name']

    def __str__(self):
        return f'{self.user.get_full_name()} ({self.get_role_display()})'
