"""
Catalog models — ProductCategory, Product, PriceList, PriceListItem, ProductLimit.
"""
from django.db import models
from mptt.models import MPTTModel, TreeForeignKey

from core.managers import TenantManager
from core.models import TimestampedModel


class ProductCategory(MPTTModel):
    """Дърво от категории за артикули (≠ ClientGroup!)."""
    tenant = models.ForeignKey(
        'tenants.Tenant', on_delete=models.CASCADE, related_name='categories'
    )
    name = models.CharField(max_length=200)
    parent = TreeForeignKey(
        'self', null=True, blank=True, on_delete=models.CASCADE,
        related_name='children'
    )
    color = models.CharField(max_length=7, default='#3B82F6',
                             help_text='Hex цвят за POS бутон')
    legacy_id = models.CharField(max_length=50, null=True, blank=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = TenantManager()

    class MPTTMeta:
        order_insertion_by = ['name']

    class Meta:
        verbose_name_plural = 'Product Categories'

    def __str__(self):
        return self.name


class Product(TimestampedModel):
    """Продукт/артикул."""
    UNIT_CHOICES = [
        ('PCS', 'Бройки'),
        ('KG', 'Килограми'),
        ('L', 'Литри'),
        ('M', 'Метри'),
    ]
    VAT_GROUP_CHOICES = [
        ('А', 'А — 0% (освободени)'),
        ('Б', 'Б — 20% (стандартна)'),
        ('В', 'В — 20% (горива)'),
        ('Г', 'Г — 9% (хотели/книги/бебешки)'),
    ]

    tenant = models.ForeignKey(
        'tenants.Tenant', on_delete=models.CASCADE, related_name='products'
    )
    category = models.ForeignKey(
        ProductCategory, null=True, blank=True,
        on_delete=models.SET_NULL, related_name='products'
    )
    name = models.CharField(max_length=300)
    barcode = models.CharField(max_length=50, null=True, blank=True, db_index=True)
    sku = models.CharField(max_length=50, null=True, blank=True)
    unit = models.CharField(max_length=3, choices=UNIT_CHOICES, default='PCS')
    vat_group = models.CharField(max_length=1, choices=VAT_GROUP_CHOICES, default='Б')
    price = models.DecimalField(max_digits=10, decimal_places=2)
    cost_price = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True
    )
    max_discount_pct = models.FloatField(default=0)
    is_active = models.BooleanField(default=True, db_index=True)
    is_deleted = models.BooleanField(default=False)
    image = models.ImageField(upload_to='products/', null=True, blank=True)
    legacy_id = models.CharField(max_length=50, null=True, blank=True, db_index=True)

    objects = TenantManager()

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f'{self.name} ({self.price} лв.)'


class PriceList(TimestampedModel):
    """Алтернативни ценови листи — промоции, VIP, happy hour."""
    tenant = models.ForeignKey(
        'tenants.Tenant', on_delete=models.CASCADE, related_name='pricelists'
    )
    name = models.CharField(max_length=100)
    valid_from = models.DateTimeField(null=True, blank=True)
    valid_to = models.DateTimeField(null=True, blank=True)

    objects = TenantManager()

    def __str__(self):
        return self.name


class PriceListItem(models.Model):
    """Цена на артикул в конкретна ценова листа."""
    price_list = models.ForeignKey(
        PriceList, on_delete=models.CASCADE, related_name='items'
    )
    product = models.ForeignKey(
        Product, on_delete=models.CASCADE, related_name='pricelist_items'
    )
    price = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        unique_together = ('price_list', 'product')

    def __str__(self):
        return f'{self.product.name} → {self.price} лв. ({self.price_list.name})'


class ProductLimit(TimestampedModel):
    """Лимит на отстъпка за артикул по конкретно устройство."""
    product = models.ForeignKey(
        Product, on_delete=models.CASCADE, related_name='limits'
    )
    device = models.ForeignKey(
        'tenants.POSDevice', on_delete=models.CASCADE, related_name='product_limits'
    )
    max_discount = models.FloatField(default=0)

    class Meta:
        unique_together = ('product', 'device')

    def __str__(self):
        return f'{self.product.name} @ {self.device.display_name}: max {self.max_discount}%'
