"""
Clients models — ClientGroup, Card, ClientAccount, SpendingLimit.
"""
from django.db import models

from core.managers import TenantManager
from core.models import TimestampedModel


class ClientGroup(TimestampedModel):
    """
    Клиентска група с бизнес правила.
    Мигрирана от CATEGORIES в Детелина.
    """
    tenant = models.ForeignKey(
        'tenants.Tenant', on_delete=models.CASCADE, related_name='client_groups'
    )
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    valid_until = models.DateTimeField(null=True, blank=True)
    credit_allowed = models.BooleanField(default=False)
    overdraft_limit = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    second_payment_allowed = models.BooleanField(default=False)
    available_from = models.TimeField(null=True, blank=True)
    available_until = models.TimeField(null=True, blank=True)
    auto_top_up_amount_1 = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    auto_top_up_day_1 = models.IntegerField(null=True, blank=True)
    auto_top_up_day_2 = models.IntegerField(null=True, blank=True)
    auto_top_up_day_3 = models.IntegerField(null=True, blank=True)
    auto_top_up_day_4 = models.IntegerField(null=True, blank=True)
    auto_top_up_amount_2 = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    top_up_from_zero = models.BooleanField(default=False)
    override_preferred_prices = models.BooleanField(default=False)
    discount_on_open = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    print_balance = models.BooleanField(default=True)
    print_accumulated = models.BooleanField(default=False)
    preferred_price_allowed = models.BooleanField(default=False)
    pay_with_preferred_price = models.BooleanField(default=False)
    pay_with_card_discount = models.BooleanField(default=False)

    objects = TenantManager()

    def __str__(self):
        return self.name


class Card(TimestampedModel):
    """Физическа карта за идентификация на клиент."""
    tenant = models.ForeignKey(
        'tenants.Tenant', on_delete=models.CASCADE, related_name='cards'
    )
    physical_number = models.CharField(max_length=50, unique=True)
    logical_number = models.CharField(max_length=50, unique=True)
    created_by = models.ForeignKey(
        'tenants.TenantUser', null=True, blank=True,
        on_delete=models.SET_NULL, related_name='created_cards'
    )

    objects = TenantManager()

    def __str__(self):
        return f'Card {self.physical_number}'


class ClientAccount(TimestampedModel):
    """Клиентска сметка/акаунт."""
    tenant = models.ForeignKey(
        'tenants.Tenant', on_delete=models.CASCADE, related_name='client_accounts'
    )
    name = models.CharField(max_length=255)
    notes = models.TextField(blank=True)
    is_blocked = models.BooleanField(default=False)
    card = models.ForeignKey(
        Card, null=True, blank=True,
        on_delete=models.SET_NULL, related_name='accounts'
    )
    client_group = models.ForeignKey(
        ClientGroup, null=True, blank=True,
        on_delete=models.SET_NULL, related_name='accounts'
    )
    company_name = models.CharField(max_length=100, blank=True)
    balance_1 = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    balance_2 = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    accumulated_1 = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    accumulated_2 = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    base_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    pin_hash = models.CharField(max_length=128, blank=True)
    legacy_id = models.CharField(max_length=50, null=True, blank=True, db_index=True)

    objects = TenantManager()

    def __str__(self):
        return f'{self.name} (баланс: {self.balance_1} лв.)'


class SpendingLimit(TimestampedModel):
    """Лимит за харчене."""
    LIMIT_TYPE_CHOICES = [
        ('DAILY', 'Дневен'),
        ('WEEKLY', 'Седмичен'),
        ('MONTHLY', 'Месечен'),
    ]

    tenant = models.ForeignKey(
        'tenants.Tenant', on_delete=models.CASCADE, related_name='spending_limits'
    )
    name = models.CharField(max_length=255)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    device = models.ForeignKey(
        'tenants.POSDevice', null=True, blank=True, on_delete=models.SET_NULL
    )
    limit_type = models.CharField(max_length=10, choices=LIMIT_TYPE_CHOICES)
    valid_from = models.DateTimeField(null=True, blank=True)
    valid_to = models.DateTimeField(null=True, blank=True)

    objects = TenantManager()

    def __str__(self):
        return f'{self.name}: {self.amount} лв. ({self.get_limit_type_display()})'


class LimitClientGroup(models.Model):
    """M2M — кой лимит важи за коя клиентска група."""
    client_group = models.ForeignKey(
        ClientGroup, on_delete=models.CASCADE, related_name='limit_links'
    )
    limit = models.ForeignKey(
        SpendingLimit, on_delete=models.CASCADE, related_name='group_links'
    )

    class Meta:
        unique_together = ('client_group', 'limit')


class DeviceClientGroup(models.Model):
    """M2M — кое устройство обслужва коя клиентска група."""
    device = models.ForeignKey(
        'tenants.POSDevice', on_delete=models.CASCADE,
        related_name='client_group_links'
    )
    client_group = models.ForeignKey(
        ClientGroup, on_delete=models.CASCADE, related_name='device_links'
    )
    fiscal_mode = models.IntegerField(default=0)

    class Meta:
        unique_together = ('device', 'client_group')


class Blacklist(TimestampedModel):
    """Блокирани карти."""
    tenant = models.ForeignKey(
        'tenants.Tenant', on_delete=models.CASCADE, related_name='blacklist'
    )
    card_number = models.CharField(max_length=50)
    customer_number = models.IntegerField(null=True, blank=True)
    amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    blocked_at = models.DateTimeField()

    objects = TenantManager()

    def __str__(self):
        return f'Blocked: {self.card_number}'
