"""
Inventory models — Stock, StockMovement, Supplier, Delivery, DeliveryItem.
"""
from django.db import models

from core.models import TimestampedModel
from core.managers import TenantManager


class Supplier(TimestampedModel):
    """
    Доставчик.
    """
    tenant = models.ForeignKey(
        'tenants.Tenant',
        on_delete=models.CASCADE,
        related_name='suppliers',
    )
    name = models.CharField('Име', max_length=255)
    company_name = models.CharField('Фирма', max_length=255, blank=True, default='')
    tax_number = models.CharField('ЕИК / Булстат', max_length=20, blank=True, default='')
    vat_number = models.CharField('ДДС номер', max_length=20, blank=True, default='')
    contact_person = models.CharField('Лице за контакт', max_length=255, blank=True, default='')
    phone = models.CharField('Телефон', max_length=30, blank=True, default='')
    email = models.EmailField('E-mail', blank=True, default='')
    address = models.TextField('Адрес', blank=True, default='')
    notes = models.TextField('Бележки', blank=True, default='')
    is_active = models.BooleanField('Активен', default=True)

    objects = TenantManager()

    class Meta:
        ordering = ['name']
        verbose_name = 'Доставчик'
        verbose_name_plural = 'Доставчици'

    def __str__(self):
        return self.name


class Stock(TimestampedModel):
    """
    Current stock level per product per location.
    """
    location = models.ForeignKey(
        'tenants.Location',
        on_delete=models.CASCADE,
        related_name='stocks',
    )
    product = models.ForeignKey(
        'catalog.Product',
        on_delete=models.CASCADE,
        related_name='stocks',
    )
    quantity = models.DecimalField('Количество', max_digits=12, decimal_places=3, default=0)
    min_quantity = models.DecimalField(
        'Минимално количество',
        max_digits=12, decimal_places=3, default=0,
        help_text='Праг за предупреждение при нисък запас',
    )

    class Meta:
        unique_together = ('location', 'product')
        ordering = ['product__name']
        verbose_name = 'Наличност'
        verbose_name_plural = 'Наличности'

    def __str__(self):
        return f'{self.product.name} @ {self.location.name}: {self.quantity}'


class StockMovement(TimestampedModel):
    """
    Immutable log of stock changes (INSERT only — never update).
    """
    MOVEMENT_TYPES = [
        ('DELIVERY', 'Доставка'),
        ('SALE', 'Продажба'),
        ('VOID', 'Сторно'),
        ('ADJUSTMENT', 'Корекция'),
        ('TRANSFER_IN', 'Вътрешен трансфер — вход'),
        ('TRANSFER_OUT', 'Вътрешен трансфер — изход'),
        ('WASTE', 'Брак'),
        ('RETURN', 'Връщане'),
    ]

    location = models.ForeignKey(
        'tenants.Location',
        on_delete=models.CASCADE,
        related_name='stock_movements',
    )
    product = models.ForeignKey(
        'catalog.Product',
        on_delete=models.CASCADE,
        related_name='stock_movements',
    )
    movement_type = models.CharField('Тип движение', max_length=20, choices=MOVEMENT_TYPES)
    quantity = models.DecimalField('Количество', max_digits=12, decimal_places=3)
    cost_price = models.DecimalField(
        'Себестойност',
        max_digits=10, decimal_places=2, default=0,
    )
    reference_id = models.CharField(
        'Референция',
        max_length=100, blank=True, default='',
        help_text='Order UUID, Delivery ID, etc.',
    )
    notes = models.TextField('Бележки', blank=True, default='')

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Движение на стока'
        verbose_name_plural = 'Движения на стоки'

    def __str__(self):
        return f'{self.get_movement_type_display()} — {self.product.name}: {self.quantity}'


class Delivery(TimestampedModel):
    """
    A delivery (incoming goods) from a supplier.
    """
    STATUS_CHOICES = [
        ('DRAFT', 'Чернова'),
        ('RECEIVED', 'Получена'),
        ('CANCELLED', 'Отказана'),
    ]

    tenant = models.ForeignKey(
        'tenants.Tenant',
        on_delete=models.CASCADE,
        related_name='deliveries',
    )
    location = models.ForeignKey(
        'tenants.Location',
        on_delete=models.CASCADE,
        related_name='deliveries',
    )
    supplier = models.ForeignKey(
        Supplier,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='deliveries',
    )
    document_number = models.CharField('Номер на документ', max_length=50, blank=True, default='')
    status = models.CharField('Статус', max_length=20, choices=STATUS_CHOICES, default='DRAFT')
    total_amount = models.DecimalField(
        'Обща сума',
        max_digits=12, decimal_places=2, default=0,
    )
    notes = models.TextField('Бележки', blank=True, default='')
    received_at = models.DateTimeField('Получена на', null=True, blank=True)
    received_by = models.ForeignKey(
        'auth.User',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='received_deliveries',
    )

    objects = TenantManager()

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Доставка'
        verbose_name_plural = 'Доставки'

    def __str__(self):
        supplier_name = self.supplier.name if self.supplier else '—'
        return f'Доставка #{self.id} от {supplier_name}'


class DeliveryItem(models.Model):
    """
    Line item in a delivery.
    """
    delivery = models.ForeignKey(
        Delivery,
        on_delete=models.CASCADE,
        related_name='items',
    )
    product = models.ForeignKey(
        'catalog.Product',
        on_delete=models.CASCADE,
        related_name='delivery_items',
    )
    quantity = models.DecimalField('Количество', max_digits=12, decimal_places=3)
    unit_price = models.DecimalField('Единична цена', max_digits=10, decimal_places=2, default=0)
    total_price = models.DecimalField('Обща цена', max_digits=12, decimal_places=2, default=0)

    class Meta:
        verbose_name = 'Ред от доставка'
        verbose_name_plural = 'Редове от доставка'

    def __str__(self):
        return f'{self.product.name} x {self.quantity}'

    def save(self, *args, **kwargs):
        self.total_price = self.quantity * self.unit_price
        super().save(*args, **kwargs)
