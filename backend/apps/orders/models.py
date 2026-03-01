"""
Orders models — Shift, CashOperation, Order, OrderItem, Payment,
                FiscalReceipt, AuditLog, DailyZReport, SystemConfig,
                DeviceSettings, Alert.
"""
import uuid

from django.db import models

from core.managers import TenantManager
from core.models import TimestampedModel


# ── Shift ──────────────────────────────────────────────────────

class Shift(TimestampedModel):
    """Работна смяна на касиер."""
    STATUS_CHOICES = [
        ('OPEN', 'Отворена'),
        ('CLOSED', 'Затворена'),
    ]

    location = models.ForeignKey(
        'tenants.Location', on_delete=models.CASCADE, related_name='shifts'
    )
    device = models.ForeignKey(
        'tenants.POSDevice', on_delete=models.CASCADE, related_name='shifts'
    )
    cashier = models.ForeignKey(
        'tenants.TenantUser', on_delete=models.CASCADE, related_name='shifts'
    )
    opened_at = models.DateTimeField()
    closed_at = models.DateTimeField(null=True, blank=True)
    opening_cash = models.DecimalField(max_digits=12, decimal_places=2)
    closing_cash = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='OPEN')
    notes = models.TextField(blank=True)
    z_report = models.ForeignKey(
        'DailyZReport', null=True, blank=True,
        on_delete=models.SET_NULL, related_name='shifts'
    )

    def __str__(self):
        return f'Shift {self.cashier} @ {self.device} ({self.status})'


# ── CashOperation ─────────────────────────────────────────────

class CashOperation(TimestampedModel):
    """Служебно въвеждане / извеждане на пари."""
    OPERATION_CHOICES = [
        ('SERVICE_IN', 'Служебно въвеждане'),
        ('SERVICE_OUT', 'Служебно извеждане'),
    ]

    shift = models.ForeignKey(
        Shift, on_delete=models.PROTECT, related_name='cash_operations'
    )
    device = models.ForeignKey(
        'tenants.POSDevice', on_delete=models.PROTECT, related_name='cash_operations'
    )
    cashier = models.ForeignKey(
        'tenants.TenantUser', null=True, on_delete=models.SET_NULL,
        related_name='cash_operations'
    )
    operation_type = models.CharField(max_length=12, choices=OPERATION_CHOICES)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    notes = models.TextField(blank=True)
    fiscal_confirmed = models.BooleanField(default=False)
    fiscal_response = models.JSONField(null=True, blank=True)

    def __str__(self):
        return f'{self.get_operation_type_display()}: {self.amount} лв.'


# ── Order ──────────────────────────────────────────────────────

class Order(TimestampedModel):
    """Поръчка."""
    STATUS_CHOICES = [
        ('OPEN', 'Отворена'),
        ('PAID', 'Платена'),
        ('VOIDED', 'Анулирана'),
    ]
    ORDER_TYPE_CHOICES = [
        ('DINE_IN', 'На място'),
        ('TAKEAWAY', 'За вкъщи'),
        ('DELIVERY', 'Доставка'),
        ('RETAIL', 'Дребна продажба'),
    ]

    uuid = models.UUIDField(default=uuid.uuid4, unique=True)
    receipt_sequence = models.IntegerField()
    order_number = models.CharField(max_length=30, db_index=True)
    tenant = models.ForeignKey(
        'tenants.Tenant', on_delete=models.CASCADE, related_name='orders'
    )
    location = models.ForeignKey(
        'tenants.Location', on_delete=models.CASCADE, related_name='orders'
    )
    device = models.ForeignKey(
        'tenants.POSDevice', null=True, on_delete=models.SET_NULL,
        related_name='orders'
    )
    shift = models.ForeignKey(
        Shift, null=True, blank=True,
        on_delete=models.SET_NULL, related_name='orders'
    )
    cashier = models.ForeignKey(
        'tenants.TenantUser', null=True, on_delete=models.SET_NULL,
        related_name='orders'
    )
    client_account = models.ForeignKey(
        'clients.ClientAccount', null=True, blank=True,
        on_delete=models.SET_NULL, related_name='orders'
    )
    status = models.CharField(
        max_length=10, choices=STATUS_CHOICES, default='OPEN', db_index=True
    )
    order_type = models.CharField(max_length=10, choices=ORDER_TYPE_CHOICES)
    table_number = models.CharField(max_length=20, null=True, blank=True)
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    discount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    notes = models.TextField(blank=True)

    # Сторно/Рефунд
    refund_order = models.ForeignKey(
        'self', null=True, blank=True, on_delete=models.SET_NULL,
        related_name='refunds'
    )
    voided_at = models.DateTimeField(null=True, blank=True)
    voided_by = models.ForeignKey(
        'tenants.TenantUser', null=True, blank=True,
        on_delete=models.SET_NULL, related_name='voided_orders'
    )
    void_reason = models.TextField(blank=True)

    legacy_id = models.CharField(max_length=100, null=True, blank=True, db_index=True)

    objects = TenantManager()

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['tenant', 'status', 'created_at']),
            models.Index(fields=['device', 'receipt_sequence']),
        ]
        unique_together = [('device', 'receipt_sequence')]

    def __str__(self):
        return f'Order {self.order_number} ({self.status})'


# ── OrderItem ──────────────────────────────────────────────────

class OrderItem(models.Model):
    """
    Ред от поръчка — SNAPSHOT на продукта в момента на продажбата.
    Никога не зареждай Product.price за стара поръчка!
    """
    order = models.ForeignKey(
        Order, on_delete=models.CASCADE, related_name='items'
    )
    product = models.ForeignKey(
        'catalog.Product', null=True, on_delete=models.SET_NULL
    )
    product_name = models.CharField(max_length=300)
    product_price = models.DecimalField(max_digits=10, decimal_places=2)
    vat_group = models.CharField(max_length=1)
    cost_price = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True
    )
    quantity = models.DecimalField(max_digits=10, decimal_places=3)
    discount_pct = models.FloatField(default=0)
    line_total = models.DecimalField(max_digits=12, decimal_places=2)
    notes = models.TextField(blank=True)

    def __str__(self):
        return f'{self.product_name} x{self.quantity}'


# ── Payment ────────────────────────────────────────────────────

class Payment(TimestampedModel):
    """Плащане по поръчка."""
    PAYMENT_METHOD_CHOICES = [
        ('CASH', 'В брой'),
        ('CARD', 'С карта'),
        ('CHEQUE', 'С чек'),
        ('VOUCHER', 'С ваучер'),
        ('COUPON', 'Купон/талон'),
        ('DIGITAL', 'Безкасово/банков превод'),
        ('ACCOUNT', 'Клиентска сметка'),
        ('MIXED', 'Смесено'),
    ]

    order = models.ForeignKey(
        Order, on_delete=models.CASCADE, related_name='payments'
    )
    client_account = models.ForeignKey(
        'clients.ClientAccount', null=True, blank=True,
        on_delete=models.SET_NULL, related_name='payments'
    )
    paid_at = models.DateTimeField(auto_now_add=True)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    payment_method = models.CharField(max_length=10, choices=PAYMENT_METHOD_CHOICES)
    change_given = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    device = models.ForeignKey(
        'tenants.POSDevice', null=True, on_delete=models.SET_NULL,
        related_name='payments'
    )
    fiscal_data = models.BinaryField(null=True, blank=True)
    refund_of = models.ForeignKey(
        'self', null=True, blank=True, on_delete=models.SET_NULL
    )
    additional_info = models.CharField(max_length=100, blank=True)

    def __str__(self):
        return f'{self.get_payment_method_display()}: {self.amount} лв.'


# ── FiscalReceipt ──────────────────────────────────────────────

class FiscalReceipt(TimestampedModel):
    """Вътрешен запис след успешно фискализиране."""
    STATUS_CHOICES = [
        ('PENDING', 'Чакащ'),
        ('PRINTED', 'Разпечатан'),
        ('FAILED', 'Неуспешен'),
    ]
    STORNO_TYPE_CHOICES = [
        ('OPERATOR_ERROR', 'Операторска грешка'),
        ('REFUND', 'Връщане / рекламация'),
        ('TAX_REDUCTION', 'Намаление данъчна основа'),
    ]

    order = models.ForeignKey(
        Order, on_delete=models.CASCADE, related_name='fiscal_receipts'
    )
    receipt_number = models.CharField(max_length=50, blank=True, default='')
    fiscal_memory = models.CharField(max_length=50, blank=True, default='')
    device_serial = models.CharField(max_length=50, blank=True, default='')
    printed_at = models.DateTimeField(null=True, blank=True)
    raw_response = models.JSONField(default=dict)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='PENDING')
    idempotency_key = models.CharField(max_length=100, unique=True)
    is_storno = models.BooleanField(default=False)

    # Сторно
    storno_of = models.ForeignKey(
        'self', null=True, blank=True, on_delete=models.SET_NULL,
        related_name='storno_receipts'
    )
    storno_type = models.CharField(
        max_length=20, choices=STORNO_TYPE_CHOICES,
        null=True, blank=True
    )
    storno_reason = models.TextField(blank=True)
    initiated_by = models.ForeignKey(
        'tenants.TenantUser', null=True, blank=True,
        on_delete=models.SET_NULL, related_name='initiated_stornos'
    )

    def __str__(self):
        return f'Receipt #{self.receipt_number} ({self.status})'


# ── AuditLog ───────────────────────────────────────────────────

class AuditLog(models.Model):
    """
    Одитна пътека — бизнес практика + ДОПК чл. 38.
    Само INSERT — никога UPDATE или DELETE.
    """
    tenant = models.ForeignKey(
        'tenants.Tenant', on_delete=models.PROTECT, related_name='audit_logs'
    )
    user = models.ForeignKey(
        'tenants.TenantUser', null=True, on_delete=models.SET_NULL,
        related_name='audit_logs'
    )
    action = models.CharField(max_length=50)
    model_name = models.CharField(max_length=50)
    object_id = models.CharField(max_length=50)
    changes = models.JSONField(default=dict)
    ip_address = models.GenericIPAddressField(null=True)
    device = models.ForeignKey(
        'tenants.POSDevice', null=True, blank=True,
        on_delete=models.SET_NULL, related_name='audit_logs'
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.action} {self.model_name} #{self.object_id}'


# ── DailyZReport ──────────────────────────────────────────────

class DailyZReport(TimestampedModel):
    """Z-отчет — ХАРДУЕРНО събитие, не Django агрегация."""
    STATUS_CHOICES = [
        ('BALANCED', 'Балансиран'),
        ('SHORT', 'Недостиг'),
        ('OVER', 'Излишък'),
    ]

    location = models.ForeignKey(
        'tenants.Location', on_delete=models.CASCADE, related_name='z_reports'
    )
    date = models.DateField()
    expected_total = models.DecimalField(max_digits=12, decimal_places=2)
    fiscal_total = models.DecimalField(max_digits=12, decimal_places=2)
    difference = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES)
    closed_by = models.ForeignKey(
        'tenants.TenantUser', on_delete=models.CASCADE, related_name='z_reports'
    )
    closed_at = models.DateTimeField()
    fiscal_response = models.JSONField(null=True, blank=True)

    class Meta:
        ordering = ['-date']
        unique_together = ('location', 'date')

    def __str__(self):
        return f'Z-Report {self.location.name} {self.date} ({self.status})'


# ── SystemConfig ──────────────────────────────────────────────

class SystemConfig(models.Model):
    """Key-value конфигурация по тенант."""
    tenant = models.ForeignKey(
        'tenants.Tenant', on_delete=models.CASCADE, related_name='configs'
    )
    key = models.CharField(max_length=50)
    value = models.TextField()

    class Meta:
        unique_together = ('tenant', 'key')

    def __str__(self):
        return f'{self.key} = {self.value[:50]}'


# ── DeviceSettings ────────────────────────────────────────────

class DeviceSettings(TimestampedModel):
    """Настройки на устройство."""
    device = models.OneToOneField(
        'tenants.POSDevice', on_delete=models.CASCADE, related_name='settings'
    )
    auto_update_enabled = models.BooleanField(default=True)
    interval_from = models.TimeField(null=True, blank=True)
    interval_to = models.TimeField(null=True, blank=True)

    def __str__(self):
        return f'Settings for {self.device.display_name}'


# ── Alert ─────────────────────────────────────────────────────

class Alert(TimestampedModel):
    """Конфигурируеми системни сигнали."""
    tenant = models.ForeignKey(
        'tenants.Tenant', on_delete=models.CASCADE, related_name='alerts'
    )
    event_type = models.CharField(max_length=50)
    min_amount = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True
    )
    user = models.ForeignKey(
        'tenants.TenantUser', null=True, blank=True,
        on_delete=models.SET_NULL, related_name='alerts'
    )
    action_command = models.CharField(max_length=255, blank=True)

    def __str__(self):
        return f'Alert: {self.event_type}'
