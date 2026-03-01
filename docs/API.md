# ClovUp API Reference

> Пълна референция на REST API v1 endpoints.

**Base URL**: `https://<hostname>/api/v1/`

**Автентикация**: JWT Bearer Token — `Authorization: Bearer <access_token>`

---

## Съдържание

- [Автентикация](#автентикация)
- [Тенанти](#тенанти)
- [Каталог](#каталог)
- [Клиенти](#клиенти)
- [Поръчки](#поръчки)
- [Инвентар](#инвентар)
- [Фискализация](#фискализация)
- [Справки](#справки)
- [WebSocket](#websocket)
- [Пагинация](#пагинация)
- [Грешки](#грешки)

---

## Автентикация

### POST `/api/v1/auth/login/`

Вход в системата с username/password. Връща JWT tokens + user info.

**Permission**: `AllowAny`

**Request Body**:
```json
{
  "username": "cashier01",
  "password": "password123"
}
```

**Response 200**:
```json
{
  "access": "eyJhbGciOiJIUzI1NiIs...",
  "refresh": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 1,
    "username": "cashier01",
    "full_name": "Иван Петров",
    "role": "CASHIER",
    "tenant_id": 1
  }
}
```

**Error Responses**:
- `400` — Missing username or password
- `401` — Invalid credentials
- `403` — User not assigned to tenant or deactivated

---

### POST `/api/v1/auth/refresh/`

Обновяване на access token с refresh token.

**Request Body**:
```json
{
  "refresh": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response 200**:
```json
{
  "access": "eyJhbGciOiJIUzI1NiIs..."
}
```

---

### POST `/api/v1/auth/logout/`

Изход от системата. Blacklist-ва refresh token.

**Permission**: `IsAuthenticated`

**Request Body**:
```json
{
  "refresh": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response 200**:
```json
{
  "detail": "Logged out"
}
```

---

### POST `/api/v1/auth/device/verify/`

Верификация на API token за POS устройство.

**Request Body**:
```json
{
  "token": "dev_xxx..."
}
```

**Response 200**:
```json
{
  "device_id": 3,
  "location_id": 1,
  "tenant_id": 1
}
```

---

## Тенанти

### GET `/api/v1/tenants/me/`

Информация за текущия тенант и потребител.

**Response 200**:
```json
{
  "tenant": {
    "id": 1,
    "name": "Ресторант Добър вкус",
    "slug": "dobar-vkus",
    "tax_number": "BG123456789",
    "plan": "PROFESSIONAL",
    "is_active": true,
    "created_at": "2026-01-15T10:00:00Z"
  },
  "user": {
    "id": 1,
    "user": {"id": 1, "username": "admin", "first_name": "Иван", "last_name": "Петков", "email": "admin@example.com"},
    "full_name": "Иван Петков",
    "tenant": 1,
    "role": "OWNER",
    "card_number": null,
    "is_active": true,
    "locations": [1, 2],
    "created_at": "2026-01-15T10:00:00Z"
  }
}
```

---

### Обекти (Locations)

#### GET `/api/v1/tenants/locations/`

Списък с обекти на тенанта.

**Response 200** (paginated):
```json
{
  "count": 2,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 1,
      "tenant": 1,
      "name": "Централен обект",
      "address": "бул. Витоша 100",
      "city": "София",
      "object_name": "0001",
      "created_at": "2026-01-15T10:00:00Z"
    }
  ]
}
```

#### POST `/api/v1/tenants/locations/`

Създаване на нов обект.

**Request Body**:
```json
{
  "name": "Клон Пловдив",
  "address": "бул. Марица 10",
  "city": "Пловдив",
  "object_name": "0002"
}
```

#### PATCH `/api/v1/tenants/locations/{id}/`

Редакция на обект. Partial update.

#### DELETE `/api/v1/tenants/locations/{id}/`

Изтриване на обект.

---

### POS Устройства

#### GET `/api/v1/tenants/devices/`

Списък POS устройства.

**Response item**:
```json
{
  "id": 1,
  "location": 1,
  "location_name": "Централен обект",
  "logical_name": "POS-01",
  "display_name": "Каса 1",
  "notes": "",
  "api_token": "dev_xxx...",
  "is_online": true,
  "last_seen_at": "2026-02-28T14:30:00Z",
  "created_at": "2026-01-15T10:00:00Z"
}
```

#### POST `/api/v1/tenants/devices/`

```json
{
  "location": 1,
  "logical_name": "POS-02",
  "display_name": "Каса 2",
  "notes": "Втора каса"
}
```

#### PATCH `/api/v1/tenants/devices/{id}/`

#### DELETE `/api/v1/tenants/devices/{id}/`

---

### Потребители (TenantUser)

#### GET `/api/v1/tenants/users/`

Списък потребители свързани с тенанта.

**Response item**:
```json
{
  "id": 1,
  "user": {"id": 1, "username": "admin", "first_name": "Иван", "last_name": "Петров", "email": "admin@example.com"},
  "full_name": "Иван Петров",
  "tenant": 1,
  "role": "OWNER",
  "card_number": "0001",
  "is_active": true,
  "locations": [1, 2],
  "created_at": "2026-01-15T10:00:00Z"
}
```

**Roles**: `OWNER`, `MANAGER`, `CASHIER`, `ACCOUNTANT`, `AUDITOR`

#### POST `/api/v1/tenants/users/`

#### PATCH `/api/v1/tenants/users/{id}/`

---

## Каталог

### Категории

#### GET `/api/v1/catalog/categories/`

Списък категории (MPTT дърво). Всяка категория съдържа `children` масив.

**Response item**:
```json
{
  "id": 1,
  "name": "Напитки",
  "parent": null,
  "color": "#FF5733",
  "legacy_id": null,
  "children": [
    {
      "id": 2,
      "name": "Безалкохолни",
      "parent": 1,
      "color": "#33FF57",
      "legacy_id": null,
      "children": []
    }
  ]
}
```

#### POST `/api/v1/catalog/categories/`

```json
{
  "name": "Салати",
  "parent": null,
  "color": "#4CAF50"
}
```

#### PATCH `/api/v1/catalog/categories/{id}/`

#### DELETE `/api/v1/catalog/categories/{id}/`

---

### Продукти

#### GET `/api/v1/catalog/products/`

Списък продукти с филтри и пагинация.

**Query Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `search` | string | Търсене по име или баркод |
| `category` | int | ID на категория |
| `is_active` | bool | Само активни/неактивни |
| `vat_group` | string | ДДС група (A, B, C, D) |
| `ordering` | string | Сортиране (name, -price, etc.) |

**Response item**:
```json
{
  "id": 1,
  "category": 2,
  "category_name": "Безалкохолни",
  "name": "Coca-Cola 330ml",
  "barcode": "5449000000996",
  "sku": "CC-330",
  "unit": "бр",
  "vat_group": "B",
  "price": "2.50",
  "cost_price": "1.20",
  "max_discount_pct": 20.0,
  "is_active": true,
  "is_deleted": false,
  "image": null,
  "legacy_id": null,
  "created_at": "2026-01-20T12:00:00Z",
  "updated_at": "2026-02-28T09:00:00Z"
}
```

#### POST `/api/v1/catalog/products/`

```json
{
  "category": 2,
  "name": "Fanta 330ml",
  "barcode": "5449000000997",
  "sku": "FA-330",
  "unit": "бр",
  "vat_group": "B",
  "price": "2.50",
  "cost_price": "1.10"
}
```

#### PATCH `/api/v1/catalog/products/{id}/`

#### DELETE `/api/v1/catalog/products/{id}/`

---

### Ценови листи

#### GET `/api/v1/catalog/pricelists/`

```json
{
  "id": 1,
  "name": "Лятна промоция",
  "valid_from": "2026-06-01",
  "valid_to": "2026-08-31",
  "created_at": "2026-05-15T10:00:00Z"
}
```

#### POST `/api/v1/catalog/pricelists/`

#### GET `/api/v1/catalog/pricelist-items/`

```json
{
  "id": 1,
  "price_list": 1,
  "product": 1,
  "product_name": "Coca-Cola 330ml",
  "price": "2.00"
}
```

#### POST `/api/v1/catalog/pricelist-items/`

---

### Продуктови лимити

#### GET `/api/v1/catalog/product-limits/`

```json
{
  "id": 1,
  "product": 1,
  "device": 1,
  "max_discount": 10.0
}
```

#### POST `/api/v1/catalog/product-limits/`

---

## Клиенти

### Клиентски групи

#### GET `/api/v1/clients/groups/`

```json
{
  "id": 1,
  "tenant": 1,
  "name": "VIP Клиенти",
  "max_credit": "500.00",
  "max_overdraft": "100.00",
  "discount_pct": 10.0,
  "legacy_id": null,
  "created_at": "2026-01-20T10:00:00Z",
  "updated_at": "2026-01-20T10:00:00Z"
}
```

#### POST `/api/v1/clients/groups/`

#### PATCH `/api/v1/clients/groups/{id}/`

#### DELETE `/api/v1/clients/groups/{id}/`

---

### Клиентски сметки

#### GET `/api/v1/clients/accounts/`

```json
{
  "id": 1,
  "name": "Иван Иванов",
  "notes": "",
  "is_blocked": false,
  "card": 1,
  "card_number": "0001",
  "client_group": 1,
  "group_name": "VIP Клиенти",
  "company_name": "Фирма ООД",
  "balance_1": "150.00",
  "balance_2": "0.00",
  "accumulated_1": "500.00",
  "accumulated_2": "0.00",
  "base_amount": "0.00",
  "legacy_id": null,
  "created_at": "2026-01-25T10:00:00Z",
  "updated_at": "2026-02-28T10:00:00Z"
}
```

#### POST `/api/v1/clients/accounts/`

```json
{
  "name": "Петър Петров",
  "client_group": 1,
  "company_name": "Другата Фирма ЕООД"
}
```

#### PATCH `/api/v1/clients/accounts/{id}/`

#### DELETE `/api/v1/clients/accounts/{id}/`

#### POST `/api/v1/clients/accounts/{id}/topup/`

Зареждане на баланс.

```json
{
  "amount": "100.00",
  "notes": "Зареждане в брой"
}
```

#### POST `/api/v1/clients/accounts/{id}/block/`

Блокиране/деблокиране на сметка. Toggle.

---

### Карти

#### GET `/api/v1/clients/cards/`

```json
{
  "id": 1,
  "physical_number": "0001",
  "logical_number": "L0001",
  "created_by": 1,
  "created_at": "2026-01-20T10:00:00Z"
}
```

#### POST `/api/v1/clients/cards/`

---

### Лимити за харчене

#### GET `/api/v1/clients/spending-limits/`

```json
{
  "id": 1,
  "tenant": 1,
  "name": "Дневен лимит 50лв",
  "amount": "50.00",
  "period": "DAILY",
  "is_active": true,
  "created_at": "2026-02-01T10:00:00Z",
  "updated_at": "2026-02-01T10:00:00Z"
}
```

#### POST `/api/v1/clients/spending-limits/`

#### DELETE `/api/v1/clients/spending-limits/{id}/`

---

### Черен списък

#### GET `/api/v1/clients/blacklist/`

```json
{
  "id": 1,
  "card_number": "0005",
  "customer_number": "C0005",
  "amount": "0.00",
  "blocked_at": "2026-02-15T10:00:00Z",
  "created_at": "2026-02-15T10:00:00Z"
}
```

#### POST `/api/v1/clients/blacklist/`

```json
{
  "card_number": "0005",
  "customer_number": "C0005"
}
```

#### DELETE `/api/v1/clients/blacklist/{id}/`

---

### Свързване лимит-група

#### GET `/api/v1/clients/limit-groups/`

```json
{
  "id": 1,
  "client_group": 1,
  "group_name": "VIP Клиенти",
  "limit": 1,
  "limit_name": "Дневен лимит 50лв"
}
```

#### POST `/api/v1/clients/limit-groups/`

---

### Устройство-група

#### GET `/api/v1/clients/device-groups/`

```json
{
  "id": 1,
  "device": 1,
  "device_name": "Каса 1",
  "client_group": 1,
  "group_name": "VIP Клиенти",
  "fiscal_mode": "FISCAL"
}
```

#### POST `/api/v1/clients/device-groups/`

---

## Поръчки

### Смени

#### GET `/api/v1/orders/shifts/`

```json
{
  "id": 1,
  "location": 1,
  "device": 1,
  "cashier": 1,
  "cashier_name": "Иван Петров",
  "opened_at": "2026-02-28T08:00:00Z",
  "closed_at": null,
  "opening_cash": "100.00",
  "closing_cash": null,
  "status": "OPEN",
  "notes": "",
  "created_at": "2026-02-28T08:00:00Z"
}
```

#### POST `/api/v1/orders/shifts/`

Отваряне на нова смяна.

```json
{
  "location": 1,
  "device": 1,
  "cashier": 1,
  "opening_cash": "100.00"
}
```

#### POST `/api/v1/orders/shifts/{id}/close/`

Затваряне на текущата смяна.

```json
{
  "closing_cash": "950.00",
  "notes": "Без забележки"
}
```

---

### Поръчки

#### GET `/api/v1/orders/orders/`

**Query Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `search` | string | Търсене по номер или UUID |
| `status` | string | PENDING, PAID, VOIDED |
| `date_from` | date | От дата (YYYY-MM-DD) |
| `date_to` | date | До дата |
| `shift` | int | ID на смяна |

**Response item**:
```json
{
  "id": 1,
  "uuid": "550e8400-e29b-41d4-a716-446655440000",
  "receipt_sequence": 1,
  "order_number": "ORD-001",
  "tenant": 1,
  "location": 1,
  "device": 1,
  "shift": 1,
  "cashier": 1,
  "cashier_name": "Иван Петров",
  "client_account": null,
  "status": "PAID",
  "order_type": "RETAIL",
  "table_number": null,
  "subtotal": "10.00",
  "discount": "0.00",
  "total": "10.00",
  "notes": "",
  "refund_order": null,
  "voided_at": null,
  "voided_by": null,
  "void_reason": null,
  "items": [
    {
      "id": 1,
      "product": 1,
      "product_name": "Coca-Cola 330ml",
      "product_price": "2.50",
      "vat_group": "B",
      "cost_price": "1.20",
      "quantity": "4.000",
      "discount_pct": 0.0,
      "line_total": "10.00",
      "notes": ""
    }
  ],
  "payments": [
    {
      "id": 1,
      "order": 1,
      "client_account": null,
      "paid_at": "2026-02-28T14:30:00Z",
      "amount": "10.00",
      "payment_method": "CASH",
      "change_given": "0.00",
      "device": 1,
      "additional_info": "",
      "created_at": "2026-02-28T14:30:00Z"
    }
  ],
  "created_at": "2026-02-28T14:28:00Z",
  "updated_at": "2026-02-28T14:30:00Z"
}
```

#### POST `/api/v1/orders/orders/`

Нова поръчка (idempotent по UUID).

```json
{
  "uuid": "550e8400-e29b-41d4-a716-446655440000",
  "receipt_sequence": 1,
  "order_type": "RETAIL",
  "table_number": null,
  "shift_id": 1,
  "client_account_id": null,
  "notes": "",
  "items": [
    {
      "product_id": 1,
      "quantity": 4,
      "discount_pct": 0,
      "notes": ""
    }
  ]
}
```

#### GET `/api/v1/orders/orders/{id}/`

Детайли на поръчка.

#### POST `/api/v1/orders/orders/{id}/void/`

Анулиране на поръчка.

```json
{
  "void_reason": "Грешка на оператора"
}
```

#### POST `/api/v1/orders/orders/{id}/add_payment/`

Добавяне на плащане.

```json
{
  "amount": "10.00",
  "payment_method": "CASH",
  "change_given": "0.00",
  "client_account_id": null,
  "additional_info": ""
}
```

**Payment Methods**: `CASH`, `CARD`, `CHEQUE`, `VOUCHER`, `COUPON`, `DIGITAL`, `ACCOUNT`, `MIXED`

**Order Types**: `DINE_IN`, `TAKEAWAY`, `DELIVERY`, `RETAIL`

**Order Statuses**: `PENDING`, `PAID`, `VOIDED`

---

## Инвентар

### Доставчици

#### GET `/api/v1/inventory/suppliers/`

```json
{
  "id": 1,
  "name": "Вносител ООД",
  "company_name": "Вносител ООД",
  "tax_number": "123456789",
  "vat_number": "BG123456789",
  "contact_person": "Георги Георгиев",
  "phone": "0888123456",
  "email": "office@vnositel.bg",
  "address": "София, ул. Примерна 1",
  "notes": "",
  "is_active": true,
  "created_at": "2026-01-20T10:00:00Z",
  "updated_at": "2026-01-20T10:00:00Z"
}
```

#### POST `/api/v1/inventory/suppliers/`

#### PATCH `/api/v1/inventory/suppliers/{id}/`

#### DELETE `/api/v1/inventory/suppliers/{id}/`

---

### Наличности

#### GET `/api/v1/inventory/stock/`

```json
{
  "id": 1,
  "location": 1,
  "location_name": "Централен обект",
  "product": 1,
  "product_name": "Coca-Cola 330ml",
  "product_barcode": "5449000000996",
  "quantity": "48.000",
  "min_quantity": "10.000",
  "created_at": "2026-01-25T10:00:00Z",
  "updated_at": "2026-02-28T14:00:00Z"
}
```

#### GET `/api/v1/inventory/stock/low_stock/`

Наличности под минималното количество.

#### POST `/api/v1/inventory/stock/adjust/`

Ръчна корекция на наличност.

```json
{
  "product": 1,
  "location": 1,
  "quantity": -5,
  "movement_type": "WASTE",
  "notes": "Изтекла годност"
}
```

**Movement Types**: `ADJUSTMENT`, `WASTE`, `RETURN`

---

### Движения

#### GET `/api/v1/inventory/movements/`

```json
{
  "id": 1,
  "location": 1,
  "location_name": "Централен обект",
  "product": 1,
  "product_name": "Coca-Cola 330ml",
  "movement_type": "SALE",
  "movement_type_display": "Продажба",
  "quantity": "-4.000",
  "cost_price": "1.20",
  "reference_id": "ORD-001",
  "notes": "",
  "created_at": "2026-02-28T14:30:00Z"
}
```

---

### Доставки

#### GET `/api/v1/inventory/deliveries/`

```json
{
  "id": 1,
  "location": 1,
  "location_name": "Централен обект",
  "supplier": 1,
  "supplier_name": "Вносител ООД",
  "document_number": "INV-2026-0001",
  "status": "PENDING",
  "total_amount": "240.00",
  "notes": "",
  "received_at": null,
  "received_by": null,
  "items": [
    {
      "id": 1,
      "product": 1,
      "product_name": "Coca-Cola 330ml",
      "quantity": "200.000",
      "unit_price": "1.20",
      "total_price": "240.00"
    }
  ],
  "created_at": "2026-02-28T10:00:00Z",
  "updated_at": "2026-02-28T10:00:00Z"
}
```

#### POST `/api/v1/inventory/deliveries/`

```json
{
  "location": 1,
  "supplier": 1,
  "document_number": "INV-2026-0001",
  "notes": "",
  "items": [
    {
      "product": 1,
      "quantity": 200,
      "unit_price": 1.20
    }
  ]
}
```

#### POST `/api/v1/inventory/deliveries/{id}/receive/`

Получаване на доставка. Автоматично обновява наличностите.

**Delivery Statuses**: `PENDING`, `RECEIVED`, `CANCELLED`

---

## Фискализация

### POST `/api/v1/fiscal/receipt/`

Печат на фискален бон за дадена поръчка.

```json
{
  "order_id": 1
}
```

**Response 200**:
```json
{
  "fiscal_receipt_id": 1,
  "status": "PENDING",
  "message": "Sent to device agent"
}
```

---

### POST `/api/v1/fiscal/storno/`

Сторно на фискален бон.

```json
{
  "order_id": 1,
  "reason": "Връщане на стока",
  "storno_type": "OPERATOR_ERROR"
}
```

**Storno Types**: `OPERATOR_ERROR`, `REFUND`, `TAX_REDUCTION`

---

### POST `/api/v1/fiscal/cash-operation/`

Служебно въвеждане / извеждане.

```json
{
  "operation_type": "SERVICE_IN",
  "amount": "100.00",
  "notes": "Начална каса",
  "device_id": 1
}
```

**Operation Types**: `SERVICE_IN`, `SERVICE_OUT`

---

### POST `/api/v1/fiscal/x-report/`

X-отчет (информационен, без нулиране).

```json
{
  "device_id": 1
}
```

---

### POST `/api/v1/fiscal/z-report/`

Z-отчет (дневен отчет с нулиране).

```json
{
  "device_id": 1
}
```

---

### POST `/api/v1/fiscal/reprint/`

Повторен печат на бон.

```json
{
  "receipt_id": 1
}
```

---

### GET `/api/v1/fiscal/printer-status/`

Статус на фискалния принтер.

**Response 200**:
```json
{
  "status": "online",
  "fiscal_memory": "23456",
  "device_serial": "DT123456"
}
```

---

### POST `/api/v1/fiscal/callback/`

Callback от Device Agent при завършен фискален печат.

```json
{
  "idempotency_key": "uuid-key",
  "receipt_number": "0001234",
  "fiscal_memory": "23456",
  "device_serial": "DT123456",
  "success": true,
  "raw_response": {},
  "error": null
}
```

---

## Справки

### GET `/api/v1/reports/dashboard/`

KPI за дашборд.

**Response 200**:
```json
{
  "today_sales": "2450.00",
  "today_orders": 47,
  "avg_check": "52.13",
  "active_shift": {
    "id": 1,
    "cashier_name": "Иван Петров",
    "opened_at": "2026-02-28T08:00:00Z"
  }
}
```

---

### GET `/api/v1/reports/sales/`

Продажби по дата.

**Query**: `?date_from=2026-02-01&date_to=2026-02-28`

---

### GET `/api/v1/reports/hourly/`

Продажби по час.

**Query**: `?date=2026-02-28`

---

### GET `/api/v1/reports/top-products/`

Топ продукти.

**Query**: `?date_from=2026-02-01&date_to=2026-02-28&limit=10`

---

### GET `/api/v1/reports/vat/`

ДДС разбивка по ДДС групи (A, B, C, D).

**Query**: `?date_from=2026-02-01&date_to=2026-02-28`

---

### GET `/api/v1/reports/payments/`

Разбивка на плащания по метод.

**Query**: `?date_from=2026-02-01&date_to=2026-02-28`

---

### GET `/api/v1/reports/z-reports/`

История на Z-отчетите.

**Response item**:
```json
{
  "id": 1,
  "location": 1,
  "location_name": "Централен обект",
  "date": "2026-02-28",
  "expected_total": "2450.00",
  "fiscal_total": "2450.00",
  "difference": "0.00",
  "status": "OK",
  "closed_by": 1,
  "closed_at": "2026-02-28T23:00:00Z",
  "fiscal_response": {},
  "created_at": "2026-02-28T23:00:00Z"
}
```

---

### GET `/api/v1/reports/shifts/`

Справка по смени.

---

### GET `/api/v1/reports/export/csv/`

CSV export на продажби.

**Query**: `?date_from=2026-02-01&date_to=2026-02-28`

**Response**: `text/csv` file download.

---

### GET `/api/v1/reports/export/excel/`

Excel export на продажби (openpyxl).

**Query**: `?date_from=2026-02-01&date_to=2026-02-28`

**Response**: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` file download.

---

## WebSocket

### Endpoint

```
ws://<hostname>/ws/dashboard/?token=<JWT_ACCESS_TOKEN>
```

### Events (Server → Client)

```json
{
  "type": "order_created",
  "data": {
    "order_id": 1,
    "order_number": "ORD-001",
    "total": "10.00",
    "cashier": "Иван Петров"
  }
}
```

| Event Type | Description |
|------------|-------------|
| `order_created` | Нова поръчка е създадена |
| `order_paid` | Поръчка е платена |
| `order_voided` | Поръчка е анулирана |
| `shift_opened` | Нова смяна е отворена |
| `shift_closed` | Смяната е затворена |
| `alert` | Системна аларма (нисък запас, etc.) |

---

## Пагинация

Всички list endpoints използват `StandardResultsSetPagination`:

```json
{
  "count": 150,
  "next": "https://host/api/v1/catalog/products/?page=2",
  "previous": null,
  "results": [...]
}
```

| Parameter | Default | Max |
|-----------|---------|-----|
| `page_size` | 50 | 200 |
| `page` | 1 | — |

---

## Грешки

### HTTP Status Codes

| Code | Description |
|------|-------------|
| `200` | OK |
| `201` | Created |
| `204` | No Content (successful DELETE) |
| `400` | Bad Request (validation error) |
| `401` | Unauthorized (missing/invalid token) |
| `403` | Forbidden (insufficient permissions) |
| `404` | Not Found |
| `409` | Conflict (duplicate UUID, etc.) |
| `429` | Rate Limited |
| `500` | Internal Server Error |

### Error Response Format

```json
{
  "error": "Human-readable error message"
}
```

Or for validation errors:

```json
{
  "field_name": ["Error message 1", "Error message 2"]
}
```
