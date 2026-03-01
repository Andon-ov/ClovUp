"""
Core models — base classes for all ClovUp models.
"""
from django.db import models


class TimestampedModel(models.Model):
    """
    Abstract base class with created_at and updated_at fields.
    All business models inherit from this.
    """
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True
        ordering = ['-created_at']
