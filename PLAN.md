# ELTRADE POS/BOS — Пълен план за разработка

> Версия: 1.5 | Дата: 2026-02-27 | НЕСУПТО — не е деклариран в НАП

---

## Съдържание

1. [Преглед на проекта](#1-преглед-на-проекта)
2. [Технологичен стак](#2-технологичен-стак)
3. [Архитектура](#3-архитектура)
4. [Проектна структура](#4-проектна-структура)
5. [Database Schema](#5-database-schema)
6. [API Спецификация](#6-api-спецификация)
7. [WebSocket Events](#7-websocket-events)
8. [Фазов план — 8 етапа](#8-фазов-план--8-етапа)
9. [Правна рамка — НЕСУПТО позиция](#9-правна-рамка--несупто-позиция)
10. [Device Agent](#10-device-agent)
11. [DevOps](#11-devops)
12. [Рискове и митигации](#12-рискове-и-митигации)
13. [След MVP — Roadmap](#13-след-mvp--roadmap)

---

## 1. Преглед на проекта

### Цел
Изграждане на self-hosted POS/BOS система за търговски обекти в България — ресторанти, магазини. Системата не заменя остарелия Детелина софтуер на Eltrade, а добавя модерен Back Office с отчети в реално време и модерен уеб ПОС. Всеки клиент получава **собствен сървър**, инсталиран физически в обекта му.

### Целева аудитория
- **Краен потребител**: касиери в търговски обекти (POS touch UI)
- **Мениджъри/Собственици**: Back Office дашборд с отчети в реално време (LAN или WireGuard VPN)
- **Счетоводители**: справки, Z-отчети, Excel export (отдалечен достъп през VPN)
- **Eltrade**: self-hosted платформа, инсталирана и поддържана при клиентите

### Ключови функции

| Модул | Описание |
|-------|----------|
| **POS каса** | Touch UI за продажби, категории, плащания |
| **Back Office** | Дашборд с KPI, графики, WebSocket live feed |
| **Каталог** | Артикули, категории (MPTT), ценови листи |
| **Клиенти** | Карти, сметки, групи с кредит и лимити |
| **Инвентар** | Наличности, движения, доставки, справки |
| **Фискализация** |Елтрейд, Datecs/Tremol принтери, Z-отчет, Н-18 |
| **Справки** | Продажби, ДДС, топ артикули, Excel/CSV |
| **Локална инсталация** | 1 сървър на обект, LAN/WI-FI достъп, WireGuard VPN за remote |

---

## 2. Технологичен стак

### Backend
| Компонент | Технология | Версия | Обосновка |
|-----------|-----------|--------|-----------|
| Web Framework | Django | ≥5.0 | Зрял, богата екосистема, ORM |
| REST API | Django REST Framework | ≥3.15 | Стандарт за Django API |
| Auth | djangorestframework-simplejwt | ≥5.3 | JWT — stateless, подходящ за SPA |
| WebSocket | Django Channels + Daphne | ≥4.0 | ASGI, WebSocket support |
| Task queue | Celery + django-celery-beat | ≥5.3 | Async задачи, scheduled jobs |
| Message broker | Redis | 7.x | Celery broker + Channels layer |
| Database | PostgreSQL | 16.x | ACID, надеждна, row-level security |
| Категории | django-mptt | ≥0.16 | Дърво от категории |
| Филтриране | django-filter | ≥23.5 | Лесно филтриране в DRF |
| Excel | openpyxl | ≥3.1 | Export на справки |
| Сериен порт | pyserial | ≥3.5 | Комуникация с принтери |
| Изображения | Pillow | ≥10.0 | Upload на снимки |

### Frontend
| Компонент | Технология | Версия | Обосновка |
|-----------|-----------|--------|-----------|
| Framework | Angular | ≥17 | Strict typing, enterprise-ready |
| UI Components | PrimeNG | актуална | Touch-friendly, богати компоненти |
| Charts | ngx-echarts | актуална | Гъвкави интерактивни графики |
| State | NgRx Signals | Angular 17+ | Нов reactive primitives подход |
| HTTP | Angular HttpClient | вграден | Interceptors за JWT |
| WebSocket | RxJS WebSocketSubject | вграден | Reactive WS connection |

### Device Agent
| Компонент | Технология | Обосновка |
|-----------|-----------|-----------|
| Runtime | Python 3.12 | Стандартен за Eltrade |
| Local bridge | FastAPI | Лек ASGI сървър на localhost:8001 |
| Сериен порт | PySerial | Комуникация с фискални Datecs/Tremol принтери |
| ESC/POS | python-escpos | Кухненски/барови термопринтери |
| Offline буфер | SQLite | Embedded DB без зависимости |
| Async loop | asyncio | Неблокиращи I/O операции |

### DevOps
| Компонент | Технология | Обосновка |
|-----------|-----------|-----------|
| Контейнери | Docker + docker-compose | Лесен deploy, изолация |
| Web сървър | Nginx | Reverse proxy, HTTP routing |
| WSGI | Gunicorn | HTTP сървър за Django |
| ASGI | Daphne | WebSocket сървър |
| Хостинг | Локален мини-ПК (Intel NUC / мини-сървър) | В обекта на клиента, без месечен наем |
| OS | Ubuntu Server 22.04 LTS | Стабилна, дълъг support |
| Remote достъп | WireGuard VPN | Криптиран тунел за мениджъри и счетоводители |
| Обновления | Auto-update скрипт (systemd timer) | Pull от Docker Hub / git при нова версия |

---

## 3. Архитектура

### High-Level диаграма

```
┌─────────────────────────────────────────────────────────────────┐
│                    ТЪРГОВСКИ ОБЕКТ (локална мрежа)               │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              ЛОКАЛЕН СЪРВЪР (мини-ПК)                     │   │
│  │                                                          │   │
│  │   [Nginx :80]                                            │   │
│  │       ├── /api/  → [Gunicorn:8000] Django HTTP API       │   │
│  │       ├── /ws/   → [Daphne:8002]  Django Channels        │   │
│  │       └── /      → Angular статични файлове              │   │
│  │                                                          │   │
│  │   [PostgreSQL:5432]  [Redis:6379]                        │   │
│  │   [Celery Worker]    [Celery Beat]                       │   │
│  └──────────────────────────────────────────────────────────┘   │
│          ▲ HTTP (LAN)    ▲ HTTP (LAN)    ▲ WS (LAN)            │
│          │               │               │                       │
│  [Каса 1 (touch)]  [Каса 2]  [Таблет/BOS]  [Кухненски дисплей] │
│  Angular POS SPA                                                 │
│       │                                                          │
│       ▼                                                          │
│  [Device Agent (Python)]                                         │
│       ├── SQLite (offline буфер — при срив на сървъра)          │
│       ├── heartbeat (30 сек ping)                                │
│       └── FastAPI bridge (localhost:8001)                        │
│                   │ PySerial / USB                               │
│       [Фискален принтер Datecs/Tremol]                           │
│       [Кухненски принтер ESC/POS (Ethernet/USB)]                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
              ▲ WireGuard VPN (криптиран тунел)
              │
   [Мениджър / Собственик / Счетоводител]
   Достъп от вкъщи или офис → Angular BOS SPA
   (HTTP през VPN тунел към сървъра в обекта)
```

### Модел на инсталация

```
1 бизнес = 1 обект = 1 локален сървър = 1 инсталация на ClovUp
```

Всеки клиент на Eltrade получава **собствен сървър** в обекта си. Данните на различни клиенти са физически разделени на различни машини (МЕЖДУ ОБЕКТИТЕ МОЖЕ ДА НАПРАВИМ ЦЕНТРАЛНА БАЗА ПРЕЗ VPN АКО ИМА НУЖДА)

Кодът поддържа `tenant_id` колона по всички таблици — за вътрешна консистентност и евентуален бъдещ преход към мулти-тенант инсталация (например при верига обекти на един собственик). При стандартна инсталация има само 1 тенант в базата.

### Роли

| Роля | Достъп |
|------|--------|
| `OWNER` | Пълен достъп до всичко |
| `MANAGER` | Всичко без tenant настройки и потребители |
| `CASHIER` | Само POS + собствените си смени |
| `ACCOUNTANT` | Само справки и Z-отчети (read-only) |
| `AUDITOR` | Read-only достъп до поръчки, фискални бонове, Z-отчети, AuditLog, продукти — без права на запис. По модела на Приложение № 29, т. 19 от Н-18 (одиторски профил). Не е НАП задължение за НЕСУПТО, но позволява кооперативна проверка без споделяне на мениджърски акаунт. |

---

## 4. Проектна структура

```
ClovUp/
├── docker-compose.yml
├── docker-compose.prod.yml
├── .env.example
│
├── backend/
│   ├── Dockerfile
│   ├── manage.py
│   ├── requirements/
│   │   ├── base.txt
│   │   ├── dev.txt
│   │   └── prod.txt
│   │
│   ├── config/
│   │   ├── __init__.py
│   │   ├── settings/
│   │   │   ├── base.py          ← общи настройки
│   │   │   ├── development.py   ← DEBUG=True, local DB
│   │   │   └── production.py    ← SSL, HSTS, Sentry
│   │   ├── urls.py              ← root URL router
│   │   ├── asgi.py              ← Django Channels entry point
│   │   └── celery.py            ← Celery app instance
│   │
│   ├── core/
│   │   ├── models.py            ← TimestampedModel base class
│   │   ├── managers.py          ← TenantQuerySet, TenantManager (ЗАДЪЛЖИТЕЛЕН)
│   │   ├── permissions.py       ← IsTenantMember, IsDeviceAuthenticated
│   │   ├── pagination.py        ← StandardResultsSetPagination
│   │   └── middleware.py        ← TenantMiddleware, AuditMiddleware
│   │
│   └── apps/
│       ├── tenants/
│       │   ├── models.py        ← Tenant, Location, TenantUser, POSDevice
│       │   ├── serializers.py
│       │   ├── views.py
│       │   ├── urls.py
│       │   └── admin.py
│       │
│       ├── catalog/
│       │   ├── models.py        ← ProductCategory, Product, PriceList, PriceListItem
│       │   ├── serializers.py
│       │   ├── views.py
│       │   ├── urls.py
│       │   └── filters.py
│       │
│       ├── clients/
│       │   ├── models.py        ← ClientGroup, Card, ClientAccount, SpendingLimit
│       │   ├── serializers.py
│       │   ├── views.py
│       │   └── urls.py
│       │
│       ├── orders/
│       │   ├── models.py        ← Order, OrderItem, Payment, FiscalReceipt
│       │   ├── serializers.py
│       │   ├── views.py
│       │   ├── urls.py
│       │   └── signals.py       ← auto stock намаляване при PAID
│       │
│       ├── inventory/
│       │   ├── models.py        ← Stock, StockMovement, Supplier
│       │   ├── serializers.py
│       │   ├── views.py
│       │   ├── urls.py
│       │   └── tasks.py         ← Celery: low stock alerts
│       │
│       ├── reports/
│       │   ├── views.py         ← dashboard KPIs, sales, top products
│       │   ├── urls.py
│       │   ├── serializers.py
│       │   ├── tasks.py         ← Celery Beat: daily Z-report email
│       │   └── exporters.py     ← CSV/Excel генериране
│       │
│       ├── fiscal/
│       │   ├── models.py        ← CashOperation (служебно въвеждане/извеждане)
│       │   ├── services.py      ← print_receipt(), safe_in/out(), x_report(), z_report(), reprint()
│       │   ├── validators.py    ← H-18 validation logic
│       │   ├── serializers.py
│       │   └── urls.py
│       │
│       └── notifications/
│           ├── consumers.py     ← Django Channels WebSocket consumers
│           ├── routing.py       ← WS URL routing
│           └── signals.py       ← broadcast при нова поръчка/stock alert
│
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   ├── angular.json
│   ├── tsconfig.json
│   └── src/
│       └── app/
│           ├── app.config.ts    ← providers, routing
│           ├── app.routes.ts    ← lazy-loaded routes
│           │
│           ├── core/
│           │   ├── auth/
│           │   │   ├── auth.service.ts       ← login/refresh/logout
│           │   │   ├── auth.guard.ts         ← route protection
│           │   │   ├── role.guard.ts         ← role-based access
│           │   │   └── jwt.interceptor.ts    ← auto Bearer token
│           │   ├── interceptors/
│           │   │   ├── error.interceptor.ts  ← 503→offline, 422→validation, 500→Sentry
│           │   │   └── loading.interceptor.ts← глобален loading state
│           │   ├── services/
│           │   │   ├── tenant.service.ts
│           │   │   ├── websocket.service.ts  ← Channels connection
│           │   │   └── notification.service.ts
│           │   └── models/                   ← TypeScript interfaces
│           │       ├── tenant.model.ts
│           │       ├── order.model.ts
│           │       ├── product.model.ts
│           │       └── ...
│           │
│           ├── shared/
│           │   └── ui/
│           │       ├── spinner/
│           │       ├── toast/
│           │       └── confirm-modal/
│           │
│           └── features/
│               ├── auth/
│               │   └── login/               ← login страница
│               │
│               ├── dashboard/               ← BOS главен дашборд
│               │   ├── kpi-cards/           ← днес/седмица/месец
│               │   ├── sales-chart/         ← ECharts bar chart
│               │   ├── hourly-heatmap/      ← почасово разпределение
│               │   └── live-feed/           ← WebSocket нови поръчки
│               │
│               ├── pos/                     ← POS каса (touch UI)
│               │   ├── product-grid/        ← бутони с артикули (65%)
│               │   ├── order-summary/       ← текуща поръчка (35%)
│               │   └── payment-modal/       ← плащане: кеш/карта/сметка
│               │
│               ├── catalog/
│               │   ├── product-list/
│               │   ├── product-form/
│               │   └── category-tree/
│               │
│               ├── clients/
│               │   ├── account-list/
│               │   ├── account-form/
│               │   └── group-list/
│               │
│               ├── inventory/
│               │   ├── stock-list/
│               │   ├── movement-list/
│               │   └── movement-form/
│               │
│               ├── reports/
│               │   ├── sales-report/
│               │   ├── z-report/
│               │   └── export/
│               │
│               └── settings/
│                   ├── devices/
│                   ├── locations/
│                   └── users/
│
└── device_agent/
    ├── agent.py              ← главен async loop
    ├── config.py             ← API_URL, DEVICE_TOKEN, PRINTER_PORT
    ├── api_client.py         ← sync с Django API
    ├── local_buffer.py       ← SQLite offline буфер
    ├── heartbeat.py          ← ping на всеки 30 сек
    ├── bridge/
    │   ├── main.py           ← FastAPI app (localhost:8001)
    │   └── routes.py         ← POST /print, GET /status
    └── printers/
        ├── base.py           ← AbstractPrinter interface
        ├── datecs.py         ← Datecs FP-700/800 протокол (фискален)
        ├── tremol.py         ← Tremol FP-2000 протокол (фискален)
        └── escpos.py         ← ESC/POS стандарт (кухненски/барови принтери)
```

---

## 5. Database Schema

> Всички модели наследяват `TimestampedModel` (created_at, updated_at) освен ако не е посочено друго.
> Всички таблици с бизнес данни имат `tenant` FK.

### 5.0 Core — TenantQuerySet (задължителен)

**Без това имаш data leak между тенанти при един пропуснат `.filter(tenant=...)`.**

```python
# core/managers.py
class TenantQuerySet(QuerySet):
    def for_tenant(self, tenant):
        return self.filter(tenant=tenant)

class TenantManager(Manager):
    def get_queryset(self):
        return TenantQuerySet(self.model, using=self._db)

# Употреба — всеки модел с tenant FK автоматично наследява:
class Product(TimestampedModel):
    objects = TenantManager()
    tenant  = FK(Tenant)
    # ...

# В views:
products = Product.objects.for_tenant(request.tenant).filter(is_active=True)
```

```python
# core/permissions.py
class IsTenantMember(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            hasattr(request.user, 'tenantuser') and
            request.user.tenantuser.is_active
        )

class IsDeviceAuthenticated(BasePermission):
    """Device-Token header автентикация"""
    def has_permission(self, request, view):
        token = request.headers.get('Device-Token')
        if not token:
            return False
        try:
            device = POSDevice.objects.get(api_token=token)
            request.device = device
            request.tenant = device.location.tenant
            return True
        except POSDevice.DoesNotExist:
            return False
```

### 5.1 Core / Tenant

```python
class Tenant(TimestampedModel):
    name        = CharField(max_length=200)         # Име на фирмата
    slug        = SlugField(unique=True)             # URL-safe идентификатор
    tax_number  = CharField(max_length=20)           # ЕИК
    plan        = CharField(choices=['FREE','BASIC','PRO'])
    is_active   = BooleanField(default=True)

class Location(TimestampedModel):
    tenant      = FK(Tenant, on_delete=CASCADE)
    name        = CharField(max_length=200)          # "Обект София център"
    address     = TextField()
    city        = CharField(max_length=100)
    object_name = CharField(max_length=50)           # кратко за принтера

class POSDevice(TimestampedModel):
    location      = FK(Location)
    logical_name  = CharField(max_length=50)         # "КАСА_1"
    display_name  = CharField(max_length=100)        # "Каса 1 - Зала"
    notes         = TextField(blank=True)
    api_token     = UUIDField(default=uuid4, unique=True)
    is_online     = BooleanField(default=False)
    last_seen_at  = DateTimeField(null=True)

class TenantUser(TimestampedModel):
    user         = OneToOneField(User)
    tenant       = FK(Tenant)
    role         = CharField(choices=['OWNER','MANAGER','CASHIER','ACCOUNTANT','AUDITOR'])
    card_number  = CharField(max_length=50, blank=True)   # карта за идентификация
    pin_hash     = CharField(max_length=128, blank=True)  # PIN вход на каса
    is_active    = BooleanField(default=True)
    locations    = ManyToManyField(Location, blank=True)  # до кои обекти има достъп
```

### 5.2 Клиентска система

```python
class ClientGroup(TimestampedModel):
    """
    Клиентска група с бизнес правила.
    Мигрирана от CATEGORIES в Детелина.
    НЕ е ProductCategory — съвсем различен модел!
    """
    tenant                   = FK(Tenant)
    name                     = CharField(max_length=100)
    description              = TextField(blank=True)
    valid_until              = DateTimeField(null=True)       # групата изтича
    credit_allowed           = BooleanField(default=False)    # разрешен кредит
    overdraft_limit          = DecimalField(default=0)        # лимит на овърдрафт
    second_payment_allowed   = BooleanField(default=False)
    available_from           = TimeField(null=True)           # happy hour от
    available_until          = TimeField(null=True)           # happy hour до
    auto_top_up_amount_1     = DecimalField(default=0)        # автозареждане
    auto_top_up_day_1        = IntegerField(null=True)        # ден 1 (1-31)
    auto_top_up_day_2        = IntegerField(null=True)
    auto_top_up_day_3        = IntegerField(null=True)
    auto_top_up_day_4        = IntegerField(null=True)
    auto_top_up_amount_2     = DecimalField(default=0)
    top_up_from_zero         = BooleanField(default=False)
    override_preferred_prices= BooleanField(default=False)
    discount_on_open         = DecimalField(default=0)        # % отстъпка при отваряне
    print_balance            = BooleanField(default=True)     # принтирай баланс на бон
    print_accumulated        = BooleanField(default=False)
    preferred_price_allowed  = BooleanField(default=False)
    pay_with_preferred_price = BooleanField(default=False)
    pay_with_card_discount   = BooleanField(default=False)

class Card(TimestampedModel):
    tenant          = FK(Tenant)
    physical_number = CharField(max_length=50, unique=True)   # номер върху картата
    logical_number  = CharField(max_length=50, unique=True)   # вътрешен номер
    created_by      = FK(TenantUser, null=True, on_delete=SET_NULL)

class ClientAccount(TimestampedModel):
    """Клиентска сметка/акаунт — от ACCOUNTS в Детелина"""
    tenant         = FK(Tenant)
    name           = CharField(max_length=255)
    notes          = TextField(blank=True)
    is_blocked     = BooleanField(default=False)
    card           = FK(Card, null=True, on_delete=SET_NULL)
    client_group   = FK(ClientGroup, null=True, on_delete=SET_NULL)
    company_name   = CharField(max_length=100, blank=True)    # фирма (за фактура)
    balance_1      = DecimalField(max_digits=12, decimal_places=2, default=0)
    balance_2      = DecimalField(max_digits=12, decimal_places=2, default=0)
    accumulated_1  = DecimalField(max_digits=12, decimal_places=2, default=0)
    accumulated_2  = DecimalField(max_digits=12, decimal_places=2, default=0)
    base_amount    = DecimalField(max_digits=12, decimal_places=2, default=0)
    pin_hash       = CharField(max_length=128, blank=True)
    legacy_id      = CharField(max_length=50, null=True, blank=True, db_index=True)
    # legacy_id: IDX от ACCOUNTS в Детелина — за преходния период на миграция
```

### 5.3 Продуктов каталог

```python
class ProductCategory(MPTTModel):
    """Дърво от категории за артикули (≠ ClientGroup!)"""
    tenant     = FK(Tenant)
    name       = CharField(max_length=200)
    parent     = TreeForeignKey('self', null=True, blank=True, on_delete=CASCADE)
    color      = CharField(max_length=7)   # hex цвят за POS бутон (#FF5733)
    legacy_id  = CharField(max_length=50, null=True, blank=True, db_index=True)
    # legacy_id: оригинален IDX от Детелина — използва се при импорт и сравнителен анализ

class Product(TimestampedModel):
    tenant          = FK(Tenant)
    category        = FK(ProductCategory, null=True, on_delete=SET_NULL)
    name            = CharField(max_length=300)
    barcode         = CharField(max_length=50, null=True, db_index=True)
    sku             = CharField(max_length=50, null=True)
    unit            = CharField(choices=['PCS','KG','L','M'])   # бройки/кг/л/м
    vat_group       = CharField(choices=['А','Б','В','Г','Д']) # А=0%, Б=20%(вкл.ресторанти), В=горива 20%(отделно), Г=9%(хотели/книги/бебешки)
    price           = DecimalField(max_digits=10, decimal_places=2)
    cost_price      = DecimalField(max_digits=10, decimal_places=2, null=True)
    max_discount_pct= FloatField(default=0)   # макс. разрешена отстъпка %
    is_active       = BooleanField(default=True)
    is_deleted      = BooleanField(default=False)   # soft delete
    image           = ImageField(upload_to='products/', null=True)
    legacy_id       = CharField(max_length=50, null=True, blank=True, db_index=True)
    # legacy_id: PLU_NN от Детелина — позволява сравнение стара/нова система

class PriceList(TimestampedModel):
    """Алтернативни ценови листи — промоции, VIP, happy hour"""
    tenant      = FK(Tenant)
    name        = CharField(max_length=100)   # "Happy Hour", "VIP"
    valid_from  = DateTimeField(null=True)
    valid_to    = DateTimeField(null=True)

class PriceListItem(Model):
    price_list  = FK(PriceList, on_delete=CASCADE)
    product     = FK(Product, on_delete=CASCADE)
    price       = DecimalField(max_digits=10, decimal_places=2)
    class Meta: unique_together = ('price_list', 'product')

class ProductLimit(TimestampedModel):
    """Лимит на отстъпка за артикул по конкретно устройство"""
    product      = FK(Product)
    device       = FK(POSDevice)
    max_discount = FloatField(default=0)
    class Meta: unique_together = ('product', 'device')
```

### 5.4 Поръчки и плащания

```python
class Shift(TimestampedModel):
    """
    Работна смяна на касиер.
    Без Shift не можеш да знаеш кой касиер е отговорен за касова разлика в Z-отчета.
    Стандарт при всяка POS система.
    """
    location      = FK(Location)
    device        = FK(POSDevice)
    cashier       = FK(TenantUser)
    opened_at     = DateTimeField()
    closed_at     = DateTimeField(null=True)
    opening_cash  = DecimalField(max_digits=12, decimal_places=2)  # начална наличност
    closing_cash  = DecimalField(max_digits=12, decimal_places=2, null=True)
    status        = CharField(choices=['OPEN','CLOSED'], default='OPEN')
    notes         = TextField(blank=True)
    # При затваряне се попълва автоматично от DailyZReport
    z_report      = FK('DailyZReport', null=True, on_delete=SET_NULL)

class CashOperation(TimestampedModel):
    """
    Служебно въвеждане / служебно извеждане на пари от касата.
    Изисква се по Н-18: всяко движение на пари в брой, което НЕ е продажба,
    трябва да се регистрира на фискалното устройство ПРЕДИ или СЛЕД транзакцията.
    Без CashOperation касиерът не може легално да захрани касата или да изтегли пари.

    Изпраща хардуерна команда към фискалния принтер (ServiceIn / ServiceOut).
    Принтерът я записва в дневния отчет.
    """
    OPERATION_CHOICES = [
        ('SERVICE_IN',  'Служебно въвеждане'),   # захранване на каса
        ('SERVICE_OUT', 'Служебно извеждане'),   # изтегляне от каса
    ]
    shift          = FK(Shift, on_delete=PROTECT)
    device         = FK(POSDevice, on_delete=PROTECT)
    cashier        = FK(TenantUser, null=True, on_delete=SET_NULL)
    operation_type = CharField(max_length=12, choices=OPERATION_CHOICES)
    amount         = DecimalField(max_digits=12, decimal_places=2)
    notes          = TextField(blank=True)
    # Отговор от принтера след успешна регистрация
    fiscal_confirmed = BooleanField(default=False)
    fiscal_response  = JSONField(null=True)   # raw отговор от принтера

class Order(TimestampedModel):
    """
    ДОПК чл. 38: данните трябва да се пазят минимум 5 г. — физическото изтриване
    е риск при данъчна ревизия. Анулирането = VOIDED статус + запис в AuditLog.
    """
    uuid             = UUIDField(default=uuid4, unique=True)   # за offline POS sync
    # receipt_sequence: пореден номер по каса — ЗАДЪЛЖИТЕЛЕН за идентификация на бон
    # order_number (computed): f"{device.logical_name}-{receipt_sequence:07d}" → "КАСА_1-0000042"
    receipt_sequence = IntegerField()                          # нарастващ per-device
    order_number     = CharField(max_length=30, db_index=True) # изчислен display номер
    tenant           = FK(Tenant)
    location         = FK(Location)
    device           = FK(POSDevice, null=True, on_delete=SET_NULL)
    shift            = FK('Shift', null=True, on_delete=SET_NULL)  # смяна на касиера
    cashier          = FK(TenantUser, null=True, on_delete=SET_NULL)
    client_account   = FK(ClientAccount, null=True, on_delete=SET_NULL)
    status           = CharField(choices=['OPEN','PAID','VOIDED'], default='OPEN',
                                 db_index=True)
    order_type       = CharField(choices=['DINE_IN','TAKEAWAY','DELIVERY','RETAIL'])
    table_number     = CharField(max_length=20, null=True)
    subtotal         = DecimalField(max_digits=12, decimal_places=2, default=0)
    discount         = DecimalField(max_digits=12, decimal_places=2, default=0)
    total            = DecimalField(max_digits=12, decimal_places=2, default=0)
    notes            = TextField(blank=True)
    # Сторно/Рефунд — тази поръчка анулира оригиналната
    refund_order     = FK('self', null=True, on_delete=SET_NULL,
                          related_name='refunds')
    # Анулиране
    voided_at        = DateTimeField(null=True)
    voided_by        = FK(TenantUser, null=True, related_name='voided_orders')
    void_reason      = TextField(blank=True)
    # Миграция от Детелина
    legacy_id        = CharField(max_length=100, null=True, blank=True, db_index=True)

    class Meta:
        indexes = [
            models.Index(fields=['tenant', 'status', 'created_at']),
            models.Index(fields=['device', 'receipt_sequence']),
        ]
        unique_together = [('device', 'receipt_sequence')]

class OrderItem(Model):
    order          = FK(Order, related_name='items', on_delete=CASCADE)
    product        = FK(Product, null=True, on_delete=SET_NULL)
    # SNAPSHOT — задължителен! Никога не разчитай на текущата Product цена.
    product_name   = CharField(max_length=300)   # копие в момента на продажба
    product_price  = DecimalField(max_digits=10, decimal_places=2)
    vat_group      = CharField(max_length=1)
    cost_price     = DecimalField(max_digits=10, decimal_places=2, null=True)
    quantity       = DecimalField(max_digits=10, decimal_places=3)
    discount_pct   = FloatField(default=0)
    line_total     = DecimalField(max_digits=12, decimal_places=2)
    notes          = TextField(blank=True)   # "без лук", "добре изпечено"

class Payment(TimestampedModel):
    """
    Видове плащания по Наредба Н-18 — фискалният принтер натрупва оборот по всеки тип.
    При подаване на команда към принтера трябва да се подаде точният тип плащане.
    """
    PAYMENT_METHOD_CHOICES = [
        ('CASH',    'В брой'),                  # 0 — стандарт, всеки принтер
        ('CARD',    'С карта'),                 # 1 — POS терминал
        ('CHEQUE',  'С чек'),                   # 2
        ('VOUCHER', 'С ваучер'),                # 3
        ('COUPON',  'Купон/талон'),             # 4
        ('DIGITAL', 'Безкасово/банков превод'), # 5 — при доставки
        ('ACCOUNT', 'Клиентска сметка'),        # вътрешно — не фискализира отделно
        ('MIXED',   'Смесено'),                 # split payment CASH+CARD
    ]
    order          = FK(Order, related_name='payments', on_delete=CASCADE)
    client_account = FK(ClientAccount, null=True, on_delete=SET_NULL)
    paid_at        = DateTimeField(auto_now_add=True)
    amount         = DecimalField(max_digits=12, decimal_places=2)
    payment_method = CharField(max_length=10, choices=PAYMENT_METHOD_CHOICES)
    change_given   = DecimalField(max_digits=10, decimal_places=2, default=0)
    device         = FK(POSDevice, null=True, on_delete=SET_NULL)
    fiscal_data    = BinaryField(null=True)   # raw binary от принтера
    refund_of      = FK('self', null=True, on_delete=SET_NULL)  # ако е връщане
    additional_info= CharField(max_length=100, blank=True)

class FiscalReceipt(TimestampedModel):
    """
    Вътрешен запис след всяко успешно фискализиране.
    НЕ е НАП задължение за НЕСУПТО — ползва се за:
      1. Сторно reference (принтерът изисква номер и дата на оригиналния бон)
      2. Cross-check при ревизия по ДОПК (доказателство за регистрирана транзакция)
    """
    STORNO_TYPE_CHOICES = [
        # Наредба Н-18 + Datecs/Tremol протокол изисква конкретен тип при сторно команда
        ('OPERATOR_ERROR', 'Операторска грешка'),       # type 0 в Datecs протокола
        ('REFUND',         'Връщане / рекламация'),     # type 1 — най-честият
        ('TAX_REDUCTION',  'Намаление данъчна основа'), # type 2 — рядко
    ]
    order            = OneToOneField(Order, on_delete=CASCADE)
    receipt_number   = CharField(max_length=50)      # номер на бона от принтера
    fiscal_memory    = CharField(max_length=50)      # FM номер
    # device_serial: сериен номер на принтера — ЗАДЪЛЖИТЕЛЕН за сторно команда
    device_serial    = CharField(max_length=50)
    printed_at       = DateTimeField()
    raw_response     = JSONField()                   # пълен отговор — вж. спецификация по-долу
    status           = CharField(choices=['PENDING','PRINTED','FAILED'])
    # idempotency_key = order.uuid — предотвратява двоен печат при retry
    # Логика: преди печатане провери дали вече съществува запис с този key
    # Ако да → не печатай отново, върни съществуващия FiscalReceipt
    idempotency_key  = UUIDField(unique=True)        # = order.uuid при създаване
    # Сторно бон — referira към оригиналния бон
    storno_of        = FK('self', null=True, on_delete=SET_NULL,
                          related_name='storno_receipts')
    # storno_type: ЗАДЪЛЖИТЕЛЕН при издаване на сторно бон (подава се на принтера)
    storno_type      = CharField(max_length=20, choices=STORNO_TYPE_CHOICES,
                                 null=True, blank=True)
    storno_reason    = TextField(blank=True)     # свободен текст (за вътрешна история)
    initiated_by     = FK(TenantUser, null=True, on_delete=SET_NULL,
                          related_name='initiated_stornos')  # кой е поискал сторното
```

#### FiscalReceipt.raw_response — JSON спецификация

Полето `raw_response` трябва да съдържа **пълния отговор от фискалния принтер** в унифициран формат, независимо от марката на принтера. Използва се за сторно reference и cross-check при ревизия по ДОПК.

```json
{
  "printer_type": "DATECS",
  "printer_model": "FP-700",
  "printer_serial": "DT279013",
  "fiscal_memory_number": "02279013",

  "receipt_number": "0000247",
  "receipt_type": "SALE",

  "date": "2026-02-27",
  "time": "14:32:05",

  "operator_number": "1",
  "operator_name": "Иван Иванов",

  "items": [
    {
      "name": "Кафе еспресо",
      "quantity": "2.000",
      "unit_price": "3.00",
      "vat_group": "Б",
      "vat_rate": "20",
      "line_total": "6.00"
    }
  ],

  "totals": {
    "subtotal": "6.00",
    "discount": "0.00",
    "total": "6.00",
    "vat_А": "0.00",
    "vat_Б": "1.00",
    "vat_В": "0.00",
    "vat_Г": "0.00"
  },

  "payments": [
    { "method": "CASH", "amount": "10.00" },
    { "method": "CHANGE", "amount": "4.00" }
  ],

  "storno_reference": null,
  // При сторно бон storno_reference трябва да съдържа ВСИЧКИ полета,
  // изисквани от Datecs/Tremol протокола за сторно команда:
  // "storno_reference": {
  //   "receipt_number": "0000247",      ← номер на оригиналния бон
  //   "receipt_date": "2026-02-27",     ← дата на оригиналния бон (ЗАДЪЛЖИТЕЛНО)
  //   "receipt_time": "14:32:05",       ← час (ЗАДЪЛЖИТЕЛНО)
  //   "device_serial": "DT279013",      ← сериен номер на ФУ (ЗАДЪЛЖИТЕЛНО)
  //   "fiscal_memory_number": "02279013", ← номер на ФП (ЗАДЪЛЖИТЕЛНО)
  //   "storno_type": 1                  ← 0=op.грешка, 1=рекламация, 2=дан.основа
  // }

  "raw_bytes_hex": "1B2033...",
  "checksum": "A3F2"
}
```

> **При сторно бон:** `receipt_type` = `"STORNO"`. `storno_reference` ЗАДЪЛЖИТЕЛНО съдържа
> пълния набор данни за оригиналния бон: номер, дата, час, сериен номер на ФУ, номер на ФП и тип сторно.
> Всички тези данни се намират в `FiscalReceipt` на оригиналната поръчка —
> `device_serial`, `fiscal_memory`, `receipt_number`, `printed_at`.
> **Никога не разчитай само на `Order.id` или вътрешния номер — принтерът ги не познава.**

### 5.5 Лимити и достъп

```python
class SpendingLimit(TimestampedModel):
    """Лимит за харчене — от LIMITS в Детелина"""
    tenant      = FK(Tenant)
    name        = CharField(max_length=255)
    amount      = DecimalField(max_digits=12, decimal_places=2)
    device      = FK(POSDevice, null=True)
    limit_type  = CharField(choices=['DAILY','WEEKLY','MONTHLY'])
    valid_from  = DateTimeField(null=True)
    valid_to    = DateTimeField(null=True)

class LimitClientGroup(Model):
    """M2M — кой лимит важи за коя клиентска група"""
    client_group = FK(ClientGroup, on_delete=CASCADE)
    limit        = FK(SpendingLimit, on_delete=CASCADE)
    class Meta: unique_together = ('client_group', 'limit')

class DeviceClientGroup(Model):
    """M2M — кое устройство обслужва коя клиентска група"""
    device       = FK(POSDevice, on_delete=CASCADE)
    client_group = FK(ClientGroup, on_delete=CASCADE)
    fiscal_mode  = IntegerField(default=0)
```

### 5.6 Инвентар

```python
class Stock(Model):
    location     = FK(Location, on_delete=CASCADE)
    product      = FK(Product, on_delete=CASCADE)
    quantity     = DecimalField(max_digits=12, decimal_places=3)
    min_quantity = DecimalField(max_digits=10, decimal_places=3, default=0)
    class Meta: unique_together = ('location', 'product')

class StockMovement(TimestampedModel):
    location      = FK(Location)
    product       = FK(Product, on_delete=PROTECT, db_index=True)
    movement_type = CharField(choices=['SALE','PURCHASE','ADJUSTMENT','WASTE','TRANSFER'])
    quantity      = DecimalField(max_digits=12, decimal_places=3)   # + или -
    cost_price    = DecimalField(max_digits=10, decimal_places=2, null=True)
    reference_id  = UUIDField(null=True)   # UUID на Order ако е SALE
    notes         = TextField(blank=True)
    created_by    = FK(TenantUser, null=True, on_delete=SET_NULL)

    class Meta:
        indexes = [
            models.Index(fields=['location', 'product', 'created_at']),
            models.Index(fields=['movement_type', 'created_at']),
        ]

class Supplier(TimestampedModel):
    tenant         = FK(Tenant)
    name           = CharField(max_length=200)
    tax_number     = CharField(max_length=20, blank=True)  # ЕИК
    contact_email  = EmailField(blank=True)
    contact_phone  = CharField(max_length=20, blank=True)

# ── БЪДЕЩО (след MVP) ──────────────────────────────────────────
# class StockLot(TimestampedModel):
#     """
#     Инвентарни партиди — FIFO/LIFO управление.
#     Предвидено за хранителен сектор (срок на годност).
#     НЕ се имплементира в MVP — структурата е запазена за да не се
#     преправя целия Inventory модул по-късно.
#     """
#     stock          = FK(Stock)
#     quantity       = DecimalField(max_digits=12, decimal_places=3)
#     cost_price     = DecimalField(max_digits=10, decimal_places=2)
#     received_at    = DateTimeField()
#     expires_at     = DateTimeField(null=True)    # срок на годност
#     supplier       = FK(Supplier, null=True)
#     lot_number     = CharField(max_length=50, blank=True)  # партиден номер
#     class Meta: ordering = ['received_at']  # FIFO по подразбиране
```

### 5.7 Одит, сигурност, конфигурация

```python
class AuditLog(Model):
    """
    Бизнес практика + ДОПК чл. 38: одитна пътека за вътрешен контрол
    и защита при данъчна ревизия. НЕ е Н-18 изискване за НЕСУПТО.
    Само INSERT — никога UPDATE или DELETE.
    """
    tenant      = FK(Tenant, on_delete=PROTECT)
    user        = FK(TenantUser, null=True, on_delete=SET_NULL)  # null = system
    action      = CharField(max_length=50)   # CREATE/UPDATE/VOID/PRINT/LOGIN/PRICE_CHANGE
    model_name  = CharField(max_length=50)   # 'Order', 'Product', 'Payment'
    object_id   = CharField(max_length=50)
    changes     = JSONField()                # { "price": [9.99, 10.50] }
    ip_address  = GenericIPAddressField(null=True)
    device      = FK(POSDevice, null=True, on_delete=SET_NULL)
    created_at  = DateTimeField(auto_now_add=True)
    # ВАЖНО: без updated_at, без is_deleted

class Blacklist(TimestampedModel):
    """Блокирани карти"""
    tenant          = FK(Tenant)
    card_number     = CharField(max_length=50)
    customer_number = IntegerField(null=True)
    amount          = DecimalField(null=True)
    blocked_at      = DateTimeField()

class Alert(TimestampedModel):
    """Конфигурируеми системни сигнали"""
    tenant         = FK(Tenant)
    event_type     = CharField(max_length=50)
    min_amount     = DecimalField(null=True)
    user           = FK(TenantUser, null=True)
    action_command = CharField(max_length=255, blank=True)

class SystemConfig(Model):
    """Key-value конфигурация по тенант"""
    tenant  = FK(Tenant)
    key     = CharField(max_length=50)
    value   = TextField()
    class Meta: unique_together = ('tenant', 'key')

class DeviceSettings(TimestampedModel):
    device               = OneToOneField(POSDevice)
    auto_update_enabled  = BooleanField(default=True)
    interval_from        = TimeField(null=True)
    interval_to          = TimeField(null=True)

class DailyZReport(TimestampedModel):
    """
    Z-отчет — ХАРДУЕРНО събитие, не Django агрегация.

    Процес:
    1. POST /fiscal/z-report/ изпраща команда към принтера (през Device Agent)
    2. Принтерът нулира дневните брояци, записва Z-отчета в ФП, връща JSON
    3. Django запазва fiscal_response и попълва fiscal_total от него
    4. expected_total е Django-агрегация — използва се само за cross-check

    Ако expected_total ≠ fiscal_total → статус OVER/SHORT → нужна проверка.
    """
    location          = FK(Location)
    date              = DateField()
    # expected_total: изчислен от Django (сума на PAID поръчки за деня) — само за cross-check
    expected_total    = DecimalField(max_digits=12, decimal_places=2)
    # fiscal_total: взет от принтера (fiscal_response) — официфалният оборот
    fiscal_total      = DecimalField(max_digits=12, decimal_places=2)
    difference        = DecimalField(max_digits=10, decimal_places=2)  # = fiscal - expected
    status            = CharField(choices=['BALANCED','SHORT','OVER'])
    closed_by         = FK(TenantUser)
    closed_at         = DateTimeField()
    # Пълен raw отговор от принтера — съхрани за НАП одит
    fiscal_response   = JSONField(null=True)
    class Meta: unique_together = ('location', 'date')
```

---

## 6. API Спецификация

> Базов URL: `/api/v1/`
> Автентикация: `Authorization: Bearer <JWT>` за потребители
> Device автентикация: `Device-Token: <UUID>` header

### 6.1 Auth

| Метод | Endpoint | Описание | Auth |
|-------|----------|----------|------|
| POST | `/auth/login/` | JWT login | — |
| POST | `/auth/refresh/` | Refresh JWT token | — |
| POST | `/auth/logout/` | Blacklist refresh token | JWT |
| POST | `/auth/device/verify/` | Валидира device token | Device-Token |
| GET | `/tenants/me/` | Текущ tenant + потребител | JWT |
| GET | `/tenants/locations/` | Локации на тенанта | JWT |

**POST /auth/login/ — Request:**
```json
{ "username": "cashier1", "password": "secret" }
```
**Response:**
```json
{
  "access": "eyJ...",
  "refresh": "eyJ...",
  "user": { "id": 1, "role": "CASHIER", "full_name": "Иван Иванов" }
}
```

### 6.2 Каталог

| Метод | Endpoint | Описание |
|-------|----------|----------|
| GET | `/catalog/products/` | Списък артикули (пагинация, филтри) |
| POST | `/catalog/products/` | Нов артикул |
| GET | `/catalog/products/{id}/` | Детайл |
| PUT | `/catalog/products/{id}/` | Редактиране |
| DELETE | `/catalog/products/{id}/` | Soft delete (is_deleted=True) |
| GET | `/catalog/products/search/` | Бързо търсене по barcode/name |
| GET | `/catalog/categories/` | Дърво от категории |
| POST | `/catalog/categories/` | Нова категория |
| GET | `/catalog/pricelists/` | Ценови листи |
| POST | `/catalog/pricelists/` | Нова ценова листа |

**Query параметри за GET /catalog/products/:**
- `?category=<id>` — филтър по категория
- `?barcode=<code>` — търсене по баркод
- `?search=<term>` — full-text търсене
- `?is_active=true`
- `?page=1&page_size=50`

### 6.3 Клиенти

| Метод | Endpoint | Описание |
|-------|----------|----------|
| GET | `/clients/accounts/` | Всички клиентски акаунти |
| POST | `/clients/accounts/` | Нов акаунт |
| GET | `/clients/accounts/{id}/` | Детайл + баланс |
| PUT | `/clients/accounts/{id}/` | Редактиране |
| POST | `/clients/accounts/{id}/topup/` | Зареждане на баланс |
| POST | `/clients/accounts/{id}/block/` | Блокиране |
| GET | `/clients/groups/` | Клиентски групи |
| POST | `/clients/groups/` | Нова група |
| PUT | `/clients/groups/{id}/` | Редактиране |
| GET | `/clients/cards/` | Регистрирани карти |
| POST | `/clients/cards/` | Нова карта |
| DELETE | `/clients/cards/{id}/` | Деактивиране на карта |
| GET | `/clients/blacklist/` | Черен списък |
| POST | `/clients/blacklist/` | Добави карта в черния списък |

### 6.4 Поръчки

| Метод | Endpoint | Auth | Описание |
|-------|----------|------|----------|
| POST | `/orders/` | Device-Token | Нова поръчка от POS |
| GET | `/orders/{id}/` | JWT/Device | Детайл на поръчка |
| PATCH | `/orders/{id}/` | Device-Token | Промяна (добавяне на items) |
| POST | `/orders/{id}/payments/` | Device-Token | Добавяне на плащане |
| POST | `/orders/{id}/fiscal-print/` | Device-Token | Изпрати на принтер |
| POST | `/orders/{id}/void/` | JWT (MANAGER+) | Анулиране |
| GET | `/orders/` | JWT | BOS списък с пагинация |

**POST /orders/ — Request (Device-Token):**
```json
{
  "uuid": "550e8400-e29b-41d4-a716-446655440000",
  "receipt_sequence": 42,
  "order_type": "DINE_IN",
  "table_number": "5",
  "items": [
    {
      "product_id": 42,
      "quantity": 2,
      "discount_pct": 0,
      "notes": "без лук"
    }
  ]
}
```
**Response 201** (нова поръчка) **или 200** (вече съществуваща — идемпотентна):
```json
{
  "id": 1234,
  "uuid": "550e8400-...",
  "order_number": "КАСА_1-0000042",
  "status": "OPEN",
  "total": "25.80",
  "items": [...]
}
```

> **Идемпотентност:** `POST /orders/` използва `Order.objects.get_or_create(uuid=uuid, defaults={...})`.
> При дублиран UUID (например при offline retry) — връща съществуващата поръчка с HTTP 200 вместо 201.
> Device Agent трябва да третира и 200, и 201 като успех.
>
> **Внимание:** Идемпотентността важи само за създаването на поръчката (статус `OPEN`).
> `POST /orders/{id}/payments/` (стъпката с фискален печат) трябва да проверява дали поръчката е вече в статус `PAID`:
> — ако е `PAID` → връща съществуващия `FiscalReceipt` без повторен печат (HTTP 200);
> — ако е `OPEN` → изпълнява фискалния бон нормално (HTTP 201).
> Това предотвратява двоен печат при retry на Device Agent след timeout.

**POST /orders/{id}/void/ — Request:**
```json
{ "void_reason": "Грешна поръчка" }
```

### 6.5 Инвентар

| Метод | Endpoint | Описание |
|-------|----------|----------|
| GET | `/inventory/stock/` | Наличности по локация |
| POST | `/inventory/movements/` | Ново движение (доставка/корекция) |
| GET | `/inventory/movements/` | История на движенията |
| GET | `/inventory/alerts/` | Продукти под min_quantity |
| GET | `/inventory/suppliers/` | Доставчици |
| POST | `/inventory/suppliers/` | Нов доставчик |

**Query params за /inventory/stock/:**
- `?location=<id>`
- `?low_stock=true` — само под минимум
- `?product=<id>`

### 6.6 Справки

| Метод | Endpoint | Описание |
|-------|----------|----------|
| GET | `/reports/dashboard/` | KPI summary |
| GET | `/reports/sales/` | Продажби по период |
| GET | `/reports/top-products/` | Топ артикули |
| GET | `/reports/hourly/` | Почасово разпределение |
| GET | `/reports/vat-breakdown/` | Разбивка по ДДС групи |
| GET | `/reports/z-report/` | История на Z-отчети (четене на вече записани) |
| GET | `/reports/export/` | CSV или Excel |

> **Z/X-отчети и фискални команди:** вж. секция 6.7 — `POST /fiscal/z-report/`, `POST /fiscal/x-report/`

**GET /reports/dashboard/ — Response:**
```json
{
  "today": {
    "total": "3250.60",
    "orders_count": 87,
    "avg_order": "37.36",
    "gross_margin": "1150.20"
  },
  "week": { "total": "18420.00", "orders_count": 524 },
  "month": { "total": "72300.00", "orders_count": 2100 },
  "top_products": [
    { "name": "Кафе еспресо", "qty": 124, "total": "372.00" }
  ]
}
```

**Query params за /reports/sales/:**
- `?date_from=2026-01-01&date_to=2026-01-31`
- `?location=<id>`
- `?cashier=<id>`
- `?order_type=DINE_IN`
- `?format=json|csv|excel`

### 6.7 Фискални операции (Device)

> Тези endpoints изпращат хардуерни команди към фискалния принтер чрез Device Agent.
> Auth: `Device-Token` (от POS) или `JWT MANAGER+` (от BOS).

| Метод | Endpoint | Auth | Описание |
|-------|----------|------|----------|
| POST | `/fiscal/safe-in/` | Device-Token | Служебно въвеждане (регистрира пари в принтера) |
| POST | `/fiscal/safe-out/` | Device-Token | Служебно извеждане (регистрира пари в принтера) |
| POST | `/fiscal/x-report/` | JWT MANAGER+ | Х-отчет (текущ дневен оборот без нулиране) |
| POST | `/fiscal/z-report/` | JWT MANAGER+ | Z-отчет (нулира дневните брояchi — хардуерна команда) |
| GET | `/fiscal/printer-status/` | Device-Token | Статус + неотпечатани бонове |
| POST | `/fiscal/reprint/` | JWT MANAGER+ | Препечатване на копие на бон |

**POST /fiscal/safe-in/ — Request:**
```json
{ "amount": "200.00", "notes": "Начална наличност" }
```
**Response:**
```json
{
  "operation_id": 15,
  "fiscal_confirmed": true,
  "fiscal_response": { "printer_serial": "ED279013", "acknowledged": true }
}
```

**POST /fiscal/safe-out/ — Request:**
```json
{ "amount": "150.00", "notes": "Инкасиране" }
```
**Response:**
```json
{
  "operation_id": 16,
  "fiscal_confirmed": true,
  "fiscal_response": { "printer_serial": "ED279013", "acknowledged": true }
}
```

> Служебното въвеждане (`safe-in`) и служебното извеждане (`safe-out`) се регистрират в принтера чрез хардуерна команда — те се появяват в дневния Z-отчет на принтера.
> И двете се записват в `CashOperation` модела с `operation_type = 'IN'` / `'OUT'`.

> **Важно (Z-отчет):** `POST /fiscal/z-report/` НЕ е агрегация на данни в облака —
> изпраща хардуерна команда към принтера. Принтерът нулира дневните брояци,
> записва Z-отчета във фискалната памет и връща JSON с оборотите.
> Облакът запазва raw отговора в `DailyZReport.fiscal_response` (JSONField).
> Сумите в `DailyZReport.fiscal_total` се взимат от принтера, не се изчисляват от Django.

---

## 7. WebSocket Events

**Endpoint:** `ws://<host>/ws/dashboard/<location_id>/`
**Auth:** JWT token в query string: `?token=<access_token>`

### Server → Client Events

```json
// Нова поръчка
{
  "type": "new_order",
  "data": {
    "order_id": 1234,
    "order_uuid": "550e8400-...",
    "total": "45.60",
    "order_type": "DINE_IN",
    "table_number": "3",
    "cashier": "Иван И.",
    "created_at": "2026-02-27T14:32:00Z"
  }
}

// Обновени дневни продажби
{
  "type": "sales_update",
  "data": {
    "today_total": "3296.20",
    "today_orders": 88
  }
}

// Стоков сигнал
{
  "type": "stock_alert",
  "data": {
    "product_id": 15,
    "product_name": "Кока Кола 0.5л",
    "current_qty": 3,
    "min_qty": 10,
    "location": "Бар"
  }
}

// Статус на устройство
{
  "type": "device_status",
  "data": {
    "device_id": 2,
    "device_name": "Каса 2",
    "is_online": false,
    "last_seen_at": "2026-02-27T14:30:00Z"
  }
}
```

---

## 8. Фазов план — 8 етапа

### Етап 1 — Инфраструктура и Auth

**Backend:**
- [ ] Django project setup (`config/settings/base|development|production`)
- [ ] `core/` — `TimestampedModel`, `TenantMiddleware`, `AuditMiddleware`
- [ ] `AuditLog` модел и сигнали — от ден 1
- [ ] `Tenant`, `Location`, `TenantUser`, `POSDevice` модели
- [ ] JWT auth: login, refresh, logout (simplejwt)
- [ ] Device token middleware (`Device-Token` header)
- [ ] Permissions: `IsTenantMember`, `IsDeviceAuthenticated`, `HasRole`
- [ ] Docker + docker-compose настройка
- [ ] `.env.example` с всички необходими променливи
- [ ] Базови pytest fixtures за тестове

**Frontend:**
- [ ] Angular project setup (standalone components, signals)
- [ ] Folder структура: `core/`, `shared/`, `features/`
- [ ] Routing с lazy loading
- [ ] `AuthService` — login/refresh/logout
- [ ] `JwtInterceptor` — auto Bearer token + refresh при 401
- [ ] `ErrorInterceptor` — 503→offline банер, 422→field errors, 500→Sentry toast
- [ ] `LoadingInterceptor` — глобален loading state
- [ ] `AuthGuard` + `RoleGuard`
- [ ] Core layout: sidebar, header, responsive shell
- [ ] PrimeNG тема и глобални стилове

**Резултат:** Работещ login с JWT, защитени routes, `docker-compose up` вдига всичко.

---

### Етап 2 — Продуктов каталог

**Backend:**
- [ ] `ProductCategory` (MPTT) модел + `/catalog/categories/` API
- [ ] `Product` модел + CRUD API + soft delete
- [ ] Barcode search: `GET /catalog/products/search/?barcode=`
- [ ] Image upload с Pillow
- [ ] `PriceList` + `PriceListItem` модели + API
- [ ] `ProductLimit` модел
- [ ] `django-filter` интеграция (category, vat_group, is_active)
- [ ] Pytest тестове за catalog API

**Frontend:**
- [ ] Product list с PrimeNG DataTable + пагинация
- [ ] Категорийно дърво (sidebar/tree)
- [ ] Product form: create/edit с image upload
- [ ] Barcode scanner input
- [ ] Деактивиране (soft delete) с потвърждение

**Резултат:** Пълен CRUD за артикули и категории.

---

### Етап 3 — POS Интерфейс

**Backend:**
- [ ] `Shift` модел + `POST /shifts/open/`, `POST /shifts/close/`
- [ ] `CashOperation` модел + `POST /fiscal/safe-in/`, `POST /fiscal/safe-out/`
- [ ] `Order`, `OrderItem` модели
- [ ] `POST /orders/` endpoint — идемпотентен (get_or_create по uuid)
- [ ] `PATCH /orders/{id}/` — добавяне/премахване на items
- [ ] `Payment` модел + `POST /orders/{id}/payments/`
- [ ] Order status transitions: OPEN → PAID / VOIDED
- [ ] `receipt_sequence` генериране per-device (atomic increment)
- [ ] `order_number` изчисляване от device.logical_name + receipt_sequence
- [ ] Django signal: при PAID → намали Stock (с `select_for_update()`)

**Frontend:**
- [ ] POS layout: Product Grid (65%) | Order Summary (35%)
- [ ] Product grid — бутони по категория, touch events
- [ ] Требователства за touch: бутони мин. 60×60px, шрифт мин. 16px
- [ ] Order summary: добавяне, количество, бележка по ред
- [ ] Discount modal на ред/поръчка
- [ ] Payment modal: CASH / CARD / ACCOUNT (с ресто за кеш)
- [ ] Offline режим: при загуба на връзка с **облака** → local queue (SQLite)
- [ ] При загуба на връзка с **принтера** → блокиращ екран, продажбата НЕ може да продължи

**Резултат:** Работещ POS — отваряй поръчки, добавяй артикули, взимай плащания.

---

### Етап 4 — Инвентар

> **Защо преди Клиентска система:** Pilot клиентът трябва да знае наличностите от ден 1.
> Stock намаляването при продажба (от Етап 3) вече е активно — трябва UI за следенето му.

**Backend:**
- [ ] `Stock` модел + `GET /inventory/stock/` API
- [ ] `StockMovement` + `POST /inventory/movements/`
- [ ] Celery task: stock alerts на всеки час
- [ ] `Supplier` модел + CRUD API
- [ ] `GET /inventory/alerts/` — продукти под min_quantity
- [ ] Движение при доставка: PURCHASE тип, увеличава Stock

**Frontend:**
- [ ] Stock list по локация + цветови индикатор (зелено/жълто/червено)
- [ ] Stock movement form: доставка, брак, ревизия, трансфер
- [ ] Движения история с филтри
- [ ] Alert badge в sidebar при ниски наличности
- [ ] Suppliers CRUD

**Резултат:** Пълен инвентарен модул с автоматични сигнали.

---

### Етап 5 — Клиентска система

**Backend:**
- [ ] `ClientGroup`, `Card`, `ClientAccount` модели + CRUD API
- [ ] `SpendingLimit`, `LimitClientGroup`, `DeviceClientGroup` модели
- [ ] Баланс check при плащане с акаунт
- [ ] Автозареждане (Celery task по разписание)
- [ ] Blacklist check при всяка транзакция
- [ ] `POST /clients/accounts/{id}/topup/` endpoint
- [ ] `POST /clients/accounts/{id}/block/` endpoint

**Frontend:**
- [ ] Client accounts list + search по карта/имe
- [ ] Account detail: баланс, история на транзакции
- [ ] Account form: create/edit
- [ ] ClientGroup list + form
- [ ] В POS: опция за избор на клиент при плащане

**Резултат:** Пълна клиентска система с карти, баланси и лимити.

---

### Етап 6 — BOS Дашборд

**Backend:**
- [ ] `GET /reports/dashboard/` — KPI SQL aggregations
- [ ] `GET /reports/hourly/` — данни за heatmap (24 часа × 7 дни)
- [ ] `GET /reports/top-products/` — по оборот и по марж
- [ ] `GET /reports/vat-breakdown/` — по ДДС групи
- [ ] Django Channels setup (asgi.py, routing.py)
- [ ] WebSocket consumer: `DashboardConsumer`
- [ ] Broadcast при нова поръчка, stock alert, device status

**Frontend:**
- [ ] Dashboard layout с KPI карти
- [ ] ECharts: bar chart продажби по дни
- [ ] ECharts: hourly heatmap
- [ ] Top products таблица
- [ ] `WebSocketService` — reconnect logic
- [ ] Live feed компонент (последните N поръчки)
- [ ] Device status индикатори

**Резултат:** Real-time Back Office дашборд.

---

### Етап 7 — Справки, Фискални отчети и Export

**Backend:**
- [ ] `GET /reports/sales/` — с date range, location, cashier филтри
- [ ] `DailyZReport` модел + `fiscal_response` JSONField
- [ ] `POST /fiscal/z-report/` — изпраща хардуерна команда към принтера, записва raw отговор
- [ ] `POST /fiscal/x-report/` — Х-отчет (оборот без нулиране)
- [ ] `GET /reports/z-report/` — история на Z-отчети
- [ ] `GET /reports/export/` — CSV и Excel (openpyxl)
- [ ] Celery Beat: scheduled daily Z-отчет напомняне по имейл

**Frontend:**
- [ ] Sales report с date-range picker и филтри
- [ ] ДДС разбивка по групи (таблица + pie chart)
- [ ] Z-report страница: expected (Django) vs fiscal (принтер) сума, статус BALANCED/SHORT/OVER
- [ ] Х-отчет бутон — показва текущия дневен оборот без нулиране
- [ ] Download бутони за CSV и Excel
- [ ] AuditLog viewer (само за OWNER)

**Резултат:** Пълни справки, Z-отчет с валидация, export.

---

### Етап 8 — Хардуерна интеграция и Deploy

**Device Agent:**
- [ ] `agent.py` — главен async loop
- [ ] `api_client.py` — sync с Django API
- [ ] `local_buffer.py` — SQLite offline буфер
- [ ] `heartbeat.py` — ping на всеки 30 сек, обновява `is_online`
- [ ] `bridge/main.py` — FastAPI на localhost:8001
  - `POST /fiscal-print` — фискален бон (SALE)
  - `POST /safe-in` — служебно въвеждане
  - `POST /safe-out` — служебно извеждане
  - `POST /x-report` — Х-отчет (без нулиране)
  - `POST /z-report` — Z-отчет (нулира дневните брояци)
  - `POST /reprint` — копие на бон
  - `GET /status` — статус + неотпечатани бонове
  - `POST /kitchen-print` — кухненски принтер (ESC/POS)
  - `POST /bar-print` — барови принтер (ESC/POS)
- [ ] `printers/datecs.py` — Datecs FP-700/800 протокол
- [ ] `printers/tremol.py` — Tremol FP-2000 протокол
- [ ] Offline от **сървъра**: SQLite → при връщане → auto-sync (разрешено)
- [ ] Offline от **принтера**: блокира POS интерфейса, показва грешка (задължително!)
- [ ] `FiscalReceipt` запис след всяко успешно печатане (с `device_serial`)

**Production Deploy (локален сървър в обекта):**
- [ ] Мини-ПК setup: Ubuntu Server 22.04 LTS, Docker, docker-compose
- [ ] Nginx конфигурация (reverse proxy, HTTP — без SSL за LAN)
- [ ] Gunicorn systemd service
- [ ] Daphne systemd service (WebSocket)
- [ ] Celery + Celery Beat systemd services
- [ ] WireGuard VPN setup за remote достъп
- [ ] Auto-update скрипт + systemd timer (нощем в 3:00)
- [ ] Backup скрипт + systemd timer (нощем в 2:00)
- [ ] UPS конфигурация (apcupsd / NUT за graceful shutdown)
- [ ] Стрес тест с 10 000+ транзакции
- [ ] Пилотен тест в реален обект

**Резултат:** Пълна система в продакшен с хардуерна интеграция.

---

## 9. Правна рамка — НЕСУПТО позиция

### 9.1 Що е СУПТО и защо не декларираме

**СУПТО** = "Софтуер за Управление на Продажби в Търговски Обект", деклариран в НАП и включен в **публичния списък по чл. 118, ал. 16 от ЗДДС**.

**ClovUp НЕ е СУПТО.** Позициониран е като **"търговски POS/BOS софтуер, управляващ одобрено фискално устройство"** — **самият софтуер** не е деклариран в НАП като СУПТО. Фискалният принтер е одобрено ФУ по чл. 118, ал. 10 от ЗДДС (одобреността е на **устройството**, не на ClovUp). Тази категория е легална и масово прилагана (Hype, повечето западни POS системи, Детелина 5.x).

Глава 7а (чл. 52а–52ж), Глава 7б и Глава 7в от Наредба Н-18 важат **единствено** за СУПТО — не се прилагат за ClovUp. Изискванията по Приложение № 29 (УНП, одиторски профил, пълна одитна пътека, деклариране на версии) са извън нашия обхват.

### 9.2 Правните задължения са на ТЪРГОВЕЦА и ФИСКАЛНИЯ ПРИНТЕР

Когато клиент (търговец) използва ClovUp с одобрено ФУ, **търговецът** (не ние) е отговорен по Н-18 за:

- Регистриране на всяка продажба чрез одобрено ФУ (чл. 3 Н-18)
- Фискален бон при всяко плащане (чл. 25 Н-18)
- Дневен Z-отчет от принтера (чл. 40 Н-18)
- Служебно въвеждане/извеждане регистрирано на ФУ (чл. 39 Н-18)
- Сторно с пълни реквизити от оригиналния бон (чл. 31 Н-18)
- Съхранение на документи минимум 5 г. (чл. 38 ДОПК)

**Нашият код изпраща правилните команди към принтера → принтерът регистрира транзакцията → НАП приема данните от фискалната памет.** Легалната верига е: търговец → ФУ → НАП.

### 9.3 Имплементираме като добра бизнес практика (не НАП задължение)

| Функционалност | Защо я правим | НАП задължение? |
|----------------|---------------|-----------------|
| `AuditLog` | Вътрешен контрол + ДОПК чл. 38 (при ревизия трябва да можеш да докажеш всяка транзакция) | ❌ НЕ по Н-18 |
| `VOIDED` вместо физически DELETE | ДОПК чл. 38: данни за продажби се пазят 5 г. — физическо изтриване е риск при ревизия | ❌ НЕ по Н-18 |
| `FiscalReceipt` запис в БД | Нужен за сторно (принтерът изисква номер/дата на оригинала), и за cross-check при ДОПК ревизия | ❌ НЕ по Н-18 |
| Snapshot `product_name`/`price` в `OrderItem` | Точни исторически отчети; данните за продажбата не може да се промяват ретроактивно | ❌ НЕ по Н-18 |
| SQLite offline буфер | Непрекъсната работа при срив на сървъра; ДОПК изисква неповреден запис на всички транзакции | ❌ НЕ по Н-18 |

### 9.4 Принтер offline — бизнес политика

| Сценарий | Поведение | Обосновка |
|----------|-----------|-----------|
| **Облак offline** | POS продава; буферира в SQLite → sync при reconnect | ФП работи локално; транзакцията е регистрирана |
| **Принтер offline** | POS **БЛОКИРА** продажбите | Без потвърждение от принтера няма `receipt_number` → не можем да съставим `FiscalReceipt`; търговецът рискува глоба |

> Блокирането при принтер offline е **наша бизнес политика** за защита на клиента — не правно изискване за НЕСУПТО, но единственото правилно поведение.

### 9.5 Кухненски и барови принтери (ESC/POS, нефискални)

- **Не са ФУ** — Н-18 не регулира техния изход
- Бонът за кухнята е вътрешен документ — не се записва в `FiscalReceipt`
- **Могат** да показват артикули с цени (забраната в СУПТО контекст не важи за НЕСУПТО)
- Endpoint: `POST /kitchen-print`, `POST /bar-print` в Device Agent

### 9.6 Коректните ДДС групи (Наредба Н-18, чл. 27)

| Група | Данъчна ставка | Приложение |
|-------|----------------|------------|
| **А** | 0% / освободени | Освободени доставки, нулева ставка, не се начислява ДДС |
| **Б** | 20% | Стандартна — повечето стоки и услуги |
| **В** | 20% (отделно отчитане) | САМО течни горива чрез измервателни средства за разход на течни горива (чл. 27, т. 3) |
| **Г** | 9% | Хотелско настаняване (чл. 66а, т. 1 ЗДДС), книги/вестници/списания (т. 2), бебешки храни и пелени (т. 3) |

> **ВАЖНО:** Група **В** е за горива с **20% ДДС**, но се отчита ОТДЕЛНО от Б — за контрол на горивните приходи.
> **Ресторантски услуги са 20% (Б)** — намалената 9% ставка по чл. 66а ЗДДС не включва ресторанти.
> Firmware на Datecs/Tremol поддържа до 8 групи — проверете конкретния модел при Eltrade.

### 9.7 Сторно реквизити (чл. 31 Наредба Н-18)

При сторно от ФУ задължително се посочват:
- Номер на оригиналния фискален бон
- Дата и час на оригиналния бон
- Номер на фискалната памет (FM) от оригиналния бон
- Причина за сторно операцията

Всички тези данни се намират в `FiscalReceipt` на оригиналната поръчка: `device_serial`, `fiscal_memory`, `receipt_number`, `printed_at`.

### 9.8 AuditLog записи — кога се пише (като бизнес функция)

```
LOGIN        — при всяко влизане в системата
LOGOUT       — при излизане
CREATE       — при нов артикул/поръчка/клиент
UPDATE       — при промяна (с { field: [old, new] })
PRICE_CHANGE — специален action при промяна на цена
VOID         — при анулиране на поръчка (с void_reason)
PRINT        — при всяко фискално печатане
```

### 9.9 Пътят към СУПТО (бъдещо решение)

Ако Eltrade реши в бъдеще да декларира ClovUp като СУПТО, необходимо е:
1. Имплементация на всички Приложение № 29 изисквания (УНП, одитна пътека, одиторски профил)
2. Декларация в НАП по чл. 52б с пълна документация (DB схема, ръководство, source code достъп)
3. Notify НАП при всяка нова версия в 7-дневен срок
4. Осигуряване на "одиторски профил" (read-only access за НАП органи)
5. БД задължително в BG/EU — вече спазено (локален сървър в обекта на клиента, физически в България)

### 9.10 Опционален УНП (чл. 25, ал. 12 Н-18)

Чл. 25, ал. 12 изрично разрешава на НЕСУПТО да издава фискален бон с УНП или номер **в UNP формат** и дори да го подава към НАП сървър:

> *"Допуска се лице, използващо софтуер, който не е включен в списъка по чл. 118, ал. 16 от ЗДДС, да издава фискален бон, съдържащ УНП или друг номер във формат на УНП, както и да подава този номер към сървър на НАП."*

Това означава, че:
- Използването на УНП-подобен формат **не е заплаха** за НЕСУПТО статуса (противно на разхождащото се мнение)
- ClovUp **може опционално** да генерира УНП-like referense number и да го подава към НАП — без да е СУПТО
- Нашият `order_number` (`КАСА_1-0000042`) е вътрешен номер, различен от НАП УНП формата — не създава риск

---

## 10. Device Agent

### Архитектура

```
┌────────────────────────────────────────────┐
│           Device Agent (Python)             │
│                                            │
│  agent.py (asyncio event loop)             │
│      │                                     │
│      ├── heartbeat.py (30 сек ping)        │
│      ├── sync_loop.py (10 сек sync)        │
│      └── FastAPI bridge (localhost:8001)   │
│               │                            │
│               ▼ HTTP от Angular/Browser    │
│          POST /fiscal-print → фискален бон │
│          POST /safe-in|safe-out            │
│          POST /x-report|z-report           │
│          POST /reprint|kitchen-print       │
│          GET /status                       │
│               │                            │
│               ▼ PySerial (USB/Serial)      │
│          Datecs FP-700 / Tremol FP-2000    │
└────────────────────────────────────────────┘
        │ При offline от **облака**:
        ▼
  local_buffer.py (SQLite) ← само за cloud sync
  При reconnect → auto-sync → Django API

  ВАЖНО: При offline от **принтера**:
  → НЕ буферирай продажби
  → Блокирай POS интерфейса напълно
  → Покажи ясна грешка на касиера
```

### Offline логика

```python
async def sync_loop():
    while True:
        if await api_client.is_online():
            pending = local_buffer.get_unsynced()
            for order in pending:
                try:
                    result = await api_client.post_order(order)
                    local_buffer.mark_synced(order.local_id, result['id'])
                except Exception:
                    pass  # ще се опита следващия цикъл
        await asyncio.sleep(10)
```

### FastAPI Bridge

Браузърът не може директно да достъпи Serial/USB порт.
Затова Device Agent изнася FastAPI сървър на `localhost:8001`.

```
Angular POS  ──POST /api/v1/orders/{id}/fiscal-print/──►  Django API
                                                              │
                                              Django изпраща към Device Agent:
Django API  ──POST http://localhost:8001/print──►  FastAPI Bridge
                                                       │
                                                   PySerial
                                                       │
                                               Фискален принтер
```

### Принтер протоколи

**Datecs FP-700/800 (фискален):**
- Комуникация: Serial RS-232 или USB-Serial
- Baudrate: 9600 / 19200
- Макс. символа на ред: 36
- Команди: `RecOpen`, `Sell`, `RecClose`, `ZReport`

**Tremol FP-2000 (фискален):**
- Комуникация: Serial или Ethernet
- Tremol Protocol v2
- Команди: `OpenReceipt`, `AddItem`, `CloseReceipt`, `DailyReport`

**ESC/POS (кухненски/барови принтери — нефискални):**
- Стандарт: ESC/POS (Epson), поддържан от повечето термопринтери
- Комуникация: Ethernet (TCP:9100), USB или Serial
- Използване: Принтиране на поръчка в кухнята или на бара
- Съдържание на бона: маса, касиер, артикули с количество, бележки по редове
- Python библиотека: `python-escpos`
- **Важно:** Тези принтери НЕ са фискални — не се записва в `FiscalReceipt`

```
FastAPI bridge endpoint-и (localhost:8001):
POST /fiscal-print    → Datecs/Tremol → фискален бон (SALE)
POST /safe-in         → Datecs/Tremol → служебно въвеждане
POST /safe-out        → Datecs/Tremol → служебно извеждане
POST /x-report        → Datecs/Tremol → Х-отчет (без нулиране)
POST /z-report        → Datecs/Tremol → Z-отчет (нулира дневните брояци)
POST /reprint         → Datecs/Tremol → копие на бон
GET  /status          → статус на всички принтери + неотпечатани бонове
POST /kitchen-print   → ESC/POS → кухненски принтер (TCP:9100)
POST /bar-print       → ESC/POS → барови принтер
```

> **Важно (фискални):** Провери документацията на конкретните модели при Eltrade преди реализация. Протоколите варират между firmware версиите.

### Задължителни реквизити на фискален бон (чл. 26, ал. 1 Н-18)

```python
# printers/base.py
@dataclass
class ReceiptData:
    """
    Задължителни реквизити по чл. 26, ал. 1 Н-18.
    Device Agent трябва да подава тези данни на принтера при всяко фискализиране.
    """
    # Реквизити на търговеца (програмирани в принтера при инсталация)
    company_name:     str      # наименование на търговеца
    company_eik:      str      # ЕИК / БУЛСТАТ
    location_name:    str      # наименование на обекта
    location_address: str      # адрес на обекта

    # Реквизити на продажбата
    items: list                # артикули: name, qty, unit_price, vat_group, line_total
    payment_method: str        # CASH / CARD / CHEQUE / VOUCHER / COUPON / DIGITAL
    total: Decimal

    # Незадължително за НЕСУПТО (но допустимо по чл. 25, ал. 12)
    internal_ref: str = ""     # вътрешен номер на поръчката (не е УНП)
```

> Реквизитите на търговеца (фирма, ЕИК, адрес) се програмират в принтера при инсталация от техниците на Eltrade — не се подават от ClovUp при всеки бон. Проверете ги при първоначална настройка.

---

## 11. DevOps

### Хардуерни изисквания (локален сървър)

| Компонент | Минимум | Препоръчително |
|-----------|---------|----------------|
| CPU | Intel Core i3 / AMD Ryzen 3 | Intel NUC i5 / Ryzen 5 |
| RAM | 8 GB | 16 GB |
| Диск | 128 GB SSD | 256 GB SSD (NVMe) |
| Мрежа | 100 Mbps LAN | Gigabit LAN |
| OS | Ubuntu Server 22.04 LTS | Ubuntu Server 22.04 LTS |
| UPS | Задължителен | APC Back-UPS 650VA |

### docker-compose.yml (dev)

```yaml
services:
  db:          postgres:16-alpine
  redis:       redis:7-alpine
  backend:     Django runserver 0.0.0.0:8000
  daphne:      Daphne WebSocket 0.0.0.0:8002  # 8001 зает от Device Agent FastAPI bridge
  celery:      celery worker
  celery-beat: celery beat
  frontend:    ng serve --host 0.0.0.0
```

### Production (локален сървър в обекта)

```
Nginx (:80)
  ├── /api/   → Gunicorn:8000 (Django HTTP)
  ├── /ws/    → Daphne:8002  (Django Channels)
  └── /       → Angular static files (/var/www/clovup)

systemd services:
  - clovup-gunicorn.service
  - clovup-daphne.service
  - clovup-celery.service
  - clovup-celery-beat.service
```

### WireGuard VPN (remote достъп)

Собственикът/счетоводителят достъпва BOS от вкъщи или офис чрез WireGuard тунел към IP адреса на сървъра в обекта.

```
Сървър (в обекта):   WireGuard слуша на UDP порт 51820
Клиент (вкъщи):      wg-quick up wg0  →  HTTP към 10.0.0.1:80

Конфигурация на сървъра (/etc/wireguard/wg0.conf):
[Interface]
Address = 10.0.0.1/24
ListenPort = 51820
PrivateKey = <server_private_key>

[Peer]  # Собственик
PublicKey = <owner_public_key>
AllowedIPs = 10.0.0.2/32

[Peer]  # Счетоводител
PublicKey = <accountant_public_key>
AllowedIPs = 10.0.0.3/32
```

> SSL не е задължителен за LAN (HTTP е достатъчен). При WireGuard достъп — трафикът е криптиран от VPN тунела.

### Auto-update скрипт

```bash
# /usr/local/bin/clovup-update.sh
#!/bin/bash
set -e
cd /opt/clovup
git pull origin main
docker-compose pull
docker-compose up -d --build
docker-compose exec backend python manage.py migrate --noinput
docker-compose exec backend python manage.py collectstatic --noinput
```

```ini
# /etc/systemd/system/clovup-update.timer
[Unit]
Description=ClovUp auto-update (нощем)

[Timer]
OnCalendar=*-*-* 03:00:00
Persistent=true

[Install]
WantedBy=timers.target
```

Обновлението се пуска автоматично всяка нощ в 3:00. При грешка — systemd логва и изпраща имейл (ако е конфигуриран).

### Backup стратегия

```bash
# /usr/local/bin/clovup-backup.sh
#!/bin/bash
BACKUP_DIR=/mnt/backup/clovup
DATE=$(date +%Y-%m-%d)
mkdir -p $BACKUP_DIR

# PostgreSQL dump
docker-compose exec -T db pg_dump -U postgres clovup > $BACKUP_DIR/db_$DATE.sql

# Компресиране и почистване (пази 30 дни)
gzip $BACKUP_DIR/db_$DATE.sql
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete
```

```ini
# /etc/systemd/system/clovup-backup.timer
[Timer]
OnCalendar=*-*-* 02:00:00   # всяка нощ в 2:00
```

**Препоръки:**
- Backup на USB диск или NAS в обекта
- При критични клиенти — допълнително изпращане към облачна услуга (S3, Backblaze, Google Drive)
- Тествай restore поне веднъж преди пускане в продукция

### Environment Variables

```bash
SECRET_KEY=           # Django secret key (50+ chars random)
DATABASE_URL=         # postgres://user:pass@localhost:5432/clovup
REDIS_URL=            # redis://localhost:6379/0
ALLOWED_HOSTS=        # 192.168.1.100,10.0.0.1,localhost
CORS_ALLOWED_ORIGINS= # http://192.168.1.100,http://10.0.0.1
DEBUG=                # False в продакшен
EMAIL_HOST=           # SMTP host (за backup alerts, имейл известия)
EMAIL_HOST_USER=      # SMTP username
EMAIL_HOST_PASSWORD=  # SMTP password
```

---

## 12. Рискове и митигации

| # | Риск | Вероятност | Въздействие | Митигация |
|---|------|-----------|-------------|-----------|
| 1 | **Фискален протокол** — лоша/липсваща документация за Datecs/Tremol | Висока | Висока | Набави документация и тествай с реално устройство ПРЕДИ Етап 8. Ако трябва — купи тестово устройство рано. |
| 2 | **Offline от сървъра** — локалният сървър се срива или LAN връзката е прекъсната | Средна | Висока | Device Agent буферира поръчките в SQLite и auto-sync при reconnect. При срив на сървъра → POS продава локално с Device Agent → при рестартиране на сървъра → sync. Тествай: изключи сървъра → продавай → пусни → провери sync. |
| 2б | **Offline от фискален принтер** — при липса на комуникация с принтера | Средна | **КРИТИЧНО** | **ПРОДАЖБИТЕ СЕ БЛОКИРАТ НАПЪЛНО.** Съгласно Н-18, сделка без фискален бон е забранена — не може да се буферира и да се „разпечата след 1 час". При принтер offline → Device Agent връща грешка → POS показва блокиращ екран → касиерът отстранява проблема. **Не имплементирай** продажба без принтер. |
| 3 | **Snapshot данни** — печат на стар бон с грешна цена | — | Висока | OrderItem ЗАДЪЛЖИТЕЛНО пази product_name, product_price, vat_group, cost_price в момента на продажба. Никога не зареждай Product.price при ретроспективен печат. |
| 4 | **Race condition в Stock** — две каси намаляват едновременно | Средна | Средна | `select_for_update()` при всяко намаляване на наличност. |
| 5 | **UUID конфликт при offline sync** — ако не се използват UUID4 | Висока (без UUID) | Висока | Всяка поръчка получава UUID4 на устройството преди изпращане. |
| 6 | **Детелина миграция** — клиенти с голям каталог в стария формат | Средна | Средна | `legacy_id` поле в Product/Category/ClientAccount. Изясни формата РАНО. Напиши import скрипт преди пилотния тест. |
| 7 | **Принтерна комуникация** — FastAPI bridge не стартира / Serial грешка | Средна | Висока | Heartbeat проверява статуса на всички принтери. UI показва предупреждение при офлайн принтер. |
| 8 | **Multi-tenant data leak** — грешен tenant_id в query | Ниска | Критично | `TenantMiddleware` + базов `TenantQuerySet` филтрира по tenant автоматично. Не пиши raw SQL без tenant filter. |
| 9 | **Сторно на фискализиран бон** — принтерът изисква референция към FM номера | Средна | Висока | `FiscalReceipt.storno_of` пази връзката. `Order.refund_order` пази бизнес логиката. Тествай сторно flow в Етап 8. |
| 10 | **ESC/POS мрежови принтери** — различни IP/портове в реални обекти | Средна | Средна | `DeviceSettings` пази IP/порт на всеки принтер. `GET /printers/status` проверява достъпността при стартиране. |
| 11 | **receipt_sequence race condition** — две поръчки от едно устройство едновременно получават еднакъв номер | Ниска | Висока | Генерирай `receipt_sequence` на устройството (Device Agent) — никога два едновременни заявки на едно устройство. `unique_together = [('device', 'receipt_sequence')]` ловва дублати на DB ниво и връща грешка за retry. |
| 12 | **Хардуерна повреда** — локалният сървър (мини-ПК) се повреди | Ниска | Висока | Eltrade поддържа резервна машина. Последният backup се restore-ва за минути. Документирай restore процедурата и я тествай веднъж на 3 месеца. |
| 13 | **Токово прекъсване** — ток спира, сървърът се изключва без graceful shutdown | Средна | Висока | **UPS е задължителен** (APC 650VA или подобен). UPS + автоматично `docker-compose stop` при ниска батерия (NUT или apcupsd). При PostgreSQL корупция — restore от backup. |
| 14 | **Backup failure** — backup скриптът не е провеждан редовно | Средна | Висока | Systemd timer за нощен backup. Изпрати имейл alert при failure. Вземи backup всяка нощ и го копирай на externe носител или облачна услуга (Backblaze/S3). Тествай restore преди продукция. |
| 15 | **Локална мрежа** — рутерът/суичът се повреди, всички каси губят достъп до сървъра | Средна | Висока | Device Agent с SQLite буфер позволява локална работа без мрежа. Eltrade осигурява резервно мрежово оборудване при критични клиенти. |

---

## 13. След MVP — Roadmap

По приоритет:

| Приоритет | Модул | Описание |
|-----------|-------|----------|
| 1 | **Мобилно приложение** | Два варианта: **PWA** (BOS справки, inventory — без принтер, instant deploy) или **нативен Android** (пълен POS с USB Host API за фискален принтер — изисква Eltrade Android SDK). PWA е по-бързо за пилот; нативното е нужно за мобилни терминали. |
| 2 | **Loyalty програма** | Точки, награди, история на клиентски покупки |
| 3 | **StockLot — партиди** | FIFO/LIFO инвентар, срок на годност (структурата е предвидена в MVP схемата) |
| 4 | **Borica интеграция** | Карти в POS (изисква договор + одит — не за MVP) |
| 5 | **Multi-location управление** | Верига от обекти с консолидирани справки |
| 6 | **НАП е-фактури** | Автоматично изпращане на фактури към НАП |
| 7 | **Advanced analytics** | ML прогнози за продажби, ABC анализ на инвентара |
| 8 | **API за трети страни** | Интеграция с доставчици, счетоводни системи |

> **Забележка:** "Управление на смени" е премахнато от Roadmap — имплементирано в MVP (Етап 3, `Shift` модел).

---

## 14. Анализ на стака — обективна оценка

> Въпрос: Коя би била най-правилната архитектура и стак за този проект, ако се абстрахираме от текущите умения на разработчика?


### Обективно най-добрите стакове за тази задача

#### Вариант 1 — FastAPI + Vue 3 *(най-близо до текущия стак, минимална промяна)*

```
Backend:   FastAPI + SQLAlchemy 2.0 + Alembic
WebSocket: FastAPI native WebSocket (вграден, без Channels/Daphne)
Queue:     ARQ (async Redis queue) или APScheduler
Frontend:  Vue 3 + Pinia + Vuetify (touch-ready компоненти)
DB:        PostgreSQL
Device:    Python FastAPI + PySerial (без промяна)
```

#### Вариант 2 — .NET Core 8 + React *(обективно оптимален за POS/LOB системи)*

```
Backend:   ASP.NET Core 8 Minimal APIs
WebSocket: SignalR (industry best — auto-reconnect, fallback, клиент SDK)
Queue:     Hangfire (Redis-backed, вграден admin UI)
ORM:       Entity Framework Core 8 + PostgreSQL
Frontend:  React + Tanstack Query + shadcn/ui
Auth:      ASP.NET Core Identity + JWT
Device:    Python FastAPI + PySerial (остава Python)
```

**Защо .NET за POS системи:**
- SignalR е най-зрялата WebSocket библиотека — автоматичен reconnect, multiple transport fallback
- EF Core migrations + LINQ = type-safe запитвания без raw SQL
- Hangfire admin dashboard за background jobs (Z-report alerts, backup monitoring)
- Single Docker image, ~50MB RAM idle
- POS/ERP/LOB системите в индустрията доминантно ползват .NET

---

#### Вариант 3 — Go + React *(ако ресурсите на mini-PC са критични)*

```
Backend:   Go (Fiber или Echo)
WebSocket: gorilla/websocket
ORM:       sqlc (type-safe SQL generation от .sql файлове)
Frontend:  React + React Query
Queue:     goroutines + Redis BLPOP
Device:    Python FastAPI + PySerial
```

**Защо Go:**
- Binary ~15MB, idle RAM ~20MB — ключово за mini-PC с 8GB RAM споделено с PostgreSQL + браузъри
- Goroutines = native concurrency без async/await overhead
- Но: значително повече boilerplate за CRUD, няма ORM migration tooling на нивото на EF/Django

---

### Сравнителна таблица

| Критерий | Django + Angular | FastAPI + Vue | .NET + React | Go + React |
|----------|-----------------|---------------|--------------|------------|
| Продуктивност за CRUD | ★★★★ | ★★★★ | ★★★★ | ★★ |
| Real-time WebSocket | ★★★ | ★★★★ | ★★★★★ | ★★★★ |
| RAM на mini-PC | ★★ | ★★★★ | ★★★★ | ★★★★★ |
| Type safety | ★★★ | ★★★ | ★★★★★ | ★★★★★ |
| Ecosystem за POS/LOB | ★★★ | ★★★ | ★★★★★ | ★★ |
| Зрялост на WebSocket | ★★★ | ★★★★ | ★★★★★ | ★★★★ |

---

### Заключение

**Ако проектирам без ограничения:** .NET Core 8 + React + SignalR — стандартът за бизнес-критични локални системи в индустрията.

**Ако оставаме в Python/JS екосистемата:** FastAPI + Vue 3 е значително по-добрият избор от Django + Angular за тази специфична задача.

**Текущият Django + Angular е напълно работещ, но не оптимален.** Главните загуби са в: сложността на Channels/Daphne слоя, синхронния ORM overhead в ASGI приложение, и Angular's enterprise patterns за 12-екранен POS.

**Device Agent остава Python при всички варианти** — `pyserial` няма реална алтернатива за серийна комуникация с фискални принтери.

---

*Версия 1.2 — актуализиран с подобрения: receipt_sequence, Shift модел, idempotency_key, TenantQuerySet/TenantManager, composite DB indexes, idempotent POST /orders/, frontend error/loading interceptors, Daphne порт 8002, Roadmap PWA vs Android, Инвентар преди Клиентска система.*

*Версия 1.3 — корекции по Н-18 и фискална логика: CashOperation (SafeIn/SafeOut), X-отчет (Х-Report), Payment методи по НАП (CASH/CARD/CHEQUE/VOUCHER/COUPON/DIGITAL), Z-отчет като хардуерна команда (не Django агрегация), DailyZReport.fiscal_response JSONField, offline от принтер = блокиране на продажби (не буфериране), storno_type (OPERATOR_ERROR/REFUND/TAX_REDUCTION), пълни реквизити за сторно бон (date/time/device_serial/FM), FiscalReceipt.device_serial, AuditLog не е задължителен за не-СУПТО, FastAPI bridge пълен endpoint списък.*

*Версия 1.4 — правна рамка: пълен ребранд на позицията като НЕСУПТО (Глава 7а/7б/7в от Н-18 не важат). Секция 9 преписана с точни правни препратки (чл. 52а, чл. 52б, чл. 52з, Приложение № 29). Коригирани ДДС групи (А=0%, Б=20%, В=горива, Г=9% — предишните А=20%, Б=9% бяха грешни). Фиксиран FiscalReceipt JSON пример (vat_group Г вместо Б за ресторантски продукти). AuditLog и VOIDED статус изрично маркирани като бизнес функции, не НАП задължения. Добавена секция 9.9 за бъдещ евентуален преход към СУПТО.*

*Версия 1.5 — архитектурна промяна: преход от облачна (Hetzner) към self-hosted локална инсталация. 1 бизнес = 1 обект = 1 сървър в обекта. Обновени: Секция 1 (Преглед — self-hosted вместо SaaS), Секция 2 DevOps (локален мини-ПК, WireGuard VPN, auto-update), Секция 3 Архитектура (нова диаграма с локална мрежа), Секция 3 Модел на инсталация (замества Multi-tenancy), Секция 11 DevOps (хардуерни изисквания, WireGuard конфигурация, auto-update скрипт, backup стратегия), Секция 12 Рискове (обновен риск #2 за сървър offline, добавени рискове #12–15 за хардуер, ток, backup, локална мрежа).*
