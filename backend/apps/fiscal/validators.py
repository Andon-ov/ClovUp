"""
Fiscal validators — Н-18 compliance validation logic.

Validates fiscal data before printing to ensure compliance with
Bulgarian Наредба Н-18 requirements for fiscal devices.
"""
from decimal import Decimal

from rest_framework import serializers


# ── VAT Groups (Н-18 standard groups) ──────────────────────────

VAT_GROUPS = {
    'А': Decimal('0.00'),    # Освободени от ДДС
    'Б': Decimal('20.00'),   # Стандартна ставка 20%
    'В': Decimal('9.00'),    # Намалена ставка 9%
    'Г': Decimal('0.00'),    # Нулева ставка
}

VALID_VAT_GROUPS = set(VAT_GROUPS.keys())

# ── Payment method mapping (Н-18 fiscal codes) ─────────────────

FISCAL_PAYMENT_CODES = {
    'CASH': 'P',        # В брой
    'CARD': 'C',        # Карта (дебитна/кредитна)
    'CHEQUE': 'N',      # Чек
    'VOUCHER': 'D',     # Ваучер
    'COUPON': 'D',      # Купон/талон
    'DIGITAL': 'N',     # Безкасово/превод
    'ACCOUNT': 'N',     # Клиентска сметка
    'MIXED': 'P',       # Смесено (default to cash)
}


def validate_receipt_items(items: list[dict]) -> list[str]:
    """
    Validate receipt items for Н-18 compliance.
    Returns list of error messages (empty = valid).
    """
    errors = []

    if not items:
        errors.append('Фискалният бон трябва да съдържа поне 1 артикул.')
        return errors

    for i, item in enumerate(items, 1):
        name = item.get('name', '')
        if not name or len(name.strip()) == 0:
            errors.append(f'Артикул #{i}: Липсва наименование.')
        if len(name) > 36:
            errors.append(f'Артикул #{i}: Наименованието не може да надвишава 36 символа.')

        try:
            price = Decimal(str(item.get('price', 0)))
            if price < 0:
                errors.append(f'Артикул #{i}: Цената не може да бъде отрицателна.')
        except Exception:
            errors.append(f'Артикул #{i}: Невалидна цена.')

        try:
            qty = Decimal(str(item.get('quantity', 0)))
            if qty <= 0:
                errors.append(f'Артикул #{i}: Количеството трябва да бъде положително.')
        except Exception:
            errors.append(f'Артикул #{i}: Невалидно количество.')

        vat_group = item.get('vat_group', '')
        if vat_group not in VALID_VAT_GROUPS:
            errors.append(
                f'Артикул #{i}: Невалидна ДДС група "{vat_group}". '
                f'Допустими: {", ".join(sorted(VALID_VAT_GROUPS))}'
            )

        discount = float(item.get('discount_pct', 0))
        if discount < 0 or discount > 100:
            errors.append(f'Артикул #{i}: Отстъпката трябва да бъде между 0 и 100%.')

    return errors


def validate_receipt_payments(payments: list[dict], expected_total: Decimal) -> list[str]:
    """
    Validate payment methods and amounts for Н-18 compliance.
    Returns list of error messages.
    """
    errors = []

    if not payments:
        errors.append('Фискалният бон трябва да съдържа поне 1 плащане.')
        return errors

    total_paid = Decimal('0.00')
    for i, payment in enumerate(payments, 1):
        method = payment.get('method', '')
        if method not in FISCAL_PAYMENT_CODES:
            errors.append(
                f'Плащане #{i}: Невалиден метод "{method}". '
                f'Допустими: {", ".join(FISCAL_PAYMENT_CODES.keys())}'
            )

        try:
            amount = Decimal(str(payment.get('amount', 0)))
            if amount <= 0:
                errors.append(f'Плащане #{i}: Сумата трябва да бъде положителна.')
            total_paid += amount
        except Exception:
            errors.append(f'Плащане #{i}: Невалидна сума.')

    if total_paid < expected_total:
        errors.append(
            f'Общата сума на плащанията ({total_paid}) е по-малка от '
            f'сумата на бона ({expected_total}).'
        )

    return errors


def validate_storno_reference(original_receipt) -> list[str]:
    """
    Validate storno reference data as per Н-18 requirements.
    A storno must reference: receipt number, date, serial number, fiscal memory.
    """
    errors = []

    if not original_receipt:
        errors.append('Сторно бонът изисква референция към оригинален фискален бон.')
        return errors

    if not original_receipt.receipt_number:
        errors.append('Оригиналният бон няма номер — може да не е бил разпечатан.')

    if not original_receipt.fiscal_memory:
        errors.append('Оригиналният бон няма номер на фискална памет.')

    if not original_receipt.device_serial:
        errors.append('Оригиналният бон няма сериен номер на устройството.')

    if not original_receipt.printed_at:
        errors.append('Оригиналният бон няма дата/час на печат.')

    return errors


def validate_cash_operation(amount: Decimal, operation_type: str) -> list[str]:
    """Validate service in/out operation."""
    errors = []

    if operation_type not in ('SERVICE_IN', 'SERVICE_OUT'):
        errors.append('Невалиден тип операция. Допустими: SERVICE_IN, SERVICE_OUT.')

    if amount is None or amount <= 0:
        errors.append('Сумата трябва да бъде положителна.')

    if amount and amount > Decimal('999999.99'):
        errors.append('Сумата надвишава максимално допустимата стойност.')

    return errors


def get_fiscal_payment_code(payment_method: str) -> str:
    """Map internal payment method to Н-18 fiscal printer code."""
    return FISCAL_PAYMENT_CODES.get(payment_method, 'P')
