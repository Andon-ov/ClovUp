"""
Tenant-aware QuerySet and Manager.
Without this, a single missed .filter(tenant=...) causes data leak between tenants.
"""
from django.db import models


class TenantQuerySet(models.QuerySet):
    """QuerySet with tenant filtering built-in."""

    def for_tenant(self, tenant):
        """Filter by tenant — use this instead of .filter(tenant=...) everywhere."""
        return self.filter(tenant=tenant)


class TenantManager(models.Manager):
    """Manager that returns TenantQuerySet."""

    def get_queryset(self):
        return TenantQuerySet(self.model, using=self._db)

    def for_tenant(self, tenant):
        return self.get_queryset().for_tenant(tenant)
