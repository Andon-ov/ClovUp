# ClovUp — POS/BOS система за търговски обекти

[![License: Proprietary](https://img.shields.io/badge/License-Proprietary-red.svg)]()
[![Python 3.12+](https://img.shields.io/badge/Python-3.12+-blue.svg)]()
[![Angular 17](https://img.shields.io/badge/Angular-17-dd0031.svg)]()
[![Django 5.x](https://img.shields.io/badge/Django-5.x-092E20.svg)]()

> Self-hosted POS/BOS система за търговски обекти в България — ресторанти, магазини, вериги.

---

## Съдържание

- [Преглед](#преглед)
- [Архитектура](#архитектура)
- [Технологичен стак](#технологичен-стак)
- [Структура на проекта](#структура-на-проекта)
- [Инсталация и стартиране](#инсталация-и-стартиране)
- [Конфигурация](#конфигурация)
- [Backend API](#backend-api)
- [Frontend](#frontend)
- [Device Agent](#device-agent)
- [Deploy в продукция](#deploy-в-продукция)
- [Backup и възстановяване](#backup-и-възстановяване)
- [Разработка](#разработка)
- [Тестове](#тестове)
- [Лиценз](#лиценз)

---

## Преглед

**ClovUp** е модерна self-hosted POS/BOS платформа, проектирана за търговски обекти в България. Системата предоставя:

| Модул | Описание |
|-------|----------|
| **POS Каса** | Тъч-оптимизиран интерфейс за продажби — продуктова матрица, количка, плащане |
| **Back Office** | Дашборд с KPI в реално време, графики, WebSocket нотификации |
| **Каталог** | Артикули, категории (MPTT дърво), ценови листи, лимити |
| **Клиенти** | Карти, клиентски сметки, групи, кредит, лимити за харчене, черен списък |
| **Инвентар** | Наличности, движения, доставчици, доставки, нисък запас |
| **Поръчки** | Смени, каса операции, поръчки, плащания, анулиране |
| **Фискализация** | Datecs/Tremol принтери, бонове, сторно, X/Z-отчети |
| **Справки** | Продажби, ДДС, топ артикули, плащания, Excel/CSV export |
| **Одит** | Пълен одитен лог на всички действия в системата |
| **Нотификации** | WebSocket real-time известия за нови поръчки, аларми |

### Целева аудитория

- **Касиери** — POS тъч интерфейс за бързи продажби
- **Мениджъри / Собственици** — BOS дашборд с отчети в реално време
- **Счетоводители** — справки, Z-отчети, Excel export
- **Одитори** — пълен одитен лог на всички операции

---

## Архитектура

```
┌─────────────────────────────────────────────────────────────┐
│                    Nginx (reverse proxy)                     │
│   :443 → Angular  |  /api/ → Gunicorn  |  /ws/ → Daphne   │
└──────────┬────────────────┬─────────────────┬───────────────┘
           │                │                 │
     ┌─────▼─────┐   ┌─────▼──────┐   ┌──────▼──────┐
     │  Angular   │   │  Django    │   │   Daphne    │
     │  SPA (BOS) │   │  REST API  │   │  WebSocket  │
     │  + POS UI  │   │  Gunicorn  │   │  Channels   │
     └────────────┘   └─────┬──────┘   └──────┬──────┘
                            │                 │
                    ┌───────▼─────────────────▼───┐
                    │        PostgreSQL 16         │
                    │          Redis 7.x           │
                    └─────────────────────────────┘
                                  │
                    ┌─────────────▼───────────────┐
                    │     Celery Worker + Beat     │
                    │  (фонови задачи, отчети)     │
                    └─────────────────────────────┘

┌──────────────────────┐
│   Device Agent       │    ← Работи на всеки POS терминал
│   FastAPI :8001      │
│   ┌────────────────┐ │
│   │ Fiscal Printer │ │    ← Datecs / Tremol / ESC/POS
│   │ Serial Bridge  │ │
│   └────────────────┘ │
│   ┌────────────────┐ │
│   │ Local Buffer   │ │    ← SQLite за offline режим
│   │ (SQLite)       │ │
│   └────────────────┘ │
└──────────────────────┘
```

### Multi-tenant модел

Всеки запис в бизнес таблиците е привързан към `tenant_id`. Middleware автоматично филтрира данните спрямо тенанта на текущия потребител.

### Роли

| Роля | Достъп |
|------|--------|
| `OWNER` | Пълен достъп — всички модули + настройки |
| `MANAGER` | Каталог, инвентар, клиенти, поръчки, отчети |
| `CASHIER` | Само POS каса + текущата смяна |
| `ACCOUNTANT` | Справки (read-only) + Z-отчети + Excel export |
| `AUDITOR` | Одитен лог (read-only) |

---

## Технологичен стак

### Backend

| Компонент | Версия | Предназначение |
|-----------|--------|----------------|
| Python | 3.12+ | Runtime |
| Django | 5.x | Web framework |
| Django REST Framework | 3.15+ | REST API |
| SimpleJWT | 5.x | JWT автентикация |
| Django Channels | 4.x | WebSocket support |
| Celery | 5.3+ | Фонови задачи |
| PostgreSQL | 16 | Основна база данни |
| Redis | 7.x | Cache + Channel Layer + Celery Broker |
| django-mptt | 0.16+ | Hierarchical categories |
| django-filter | 24.x | Филтриране на API |
| openpyxl | 3.1+ | Excel export |
| Gunicorn | 22.x | WSGI сървър (production) |
| Daphne | 4.x | ASGI сървър (WebSocket) |

### Frontend

| Компонент | Версия | Предназначение |
|-----------|--------|----------------|
| Angular | 17.3 | SPA framework |
| PrimeNG | 17.18 | UI компоненти |
| PrimeFlex | 3.3.1 | CSS utility framework |
| Chart.js | 4.4 | Графики и диаграми |
| TypeScript | 5.4.5 | Типизиран JavaScript |
| RxJS | 7.8 | Reactive programming |

### Device Agent

| Компонент | Версия | Предназначение |
|-----------|--------|----------------|
| FastAPI | 0.111 | Локален HTTP сървър |
| pyserial | 3.5 | Serial комуникация с принтери |
| httpx | 0.27 | HTTP клиент към backend |
| APScheduler | 3.10 | Heartbeat scheduler |
| SQLite | вградено | Локален буфер за offline режим |

### Инфраструктура

| Компонент | Предназначение |
|-----------|----------------|
| Docker + Docker Compose | Контейнеризация |
| Nginx | Reverse proxy + SSL |
| WireGuard | VPN за отдалечен достъп |
| systemd | Timers за backup |

---

## Структура на проекта

```
ClovUp/
├── PLAN.md                     # Подробен план за разработка
├── README.md                   # Тази документация
├── docker-compose.yml          # Development setup (6 services)
├── docker-compose.prod.yml     # Production override
├── .env.example                # Примерни environment variables
│
├── backend/                    # Django backend
│   ├── Dockerfile
│   ├── manage.py
│   ├── requirements/
│   │   ├── base.txt            # Основни зависимости
│   │   ├── dev.txt             # Development (debug-toolbar, etc.)
│   │   └── prod.txt            # Production (gunicorn, sentry)
│   ├── config/                 # Django настройки
│   │   ├── settings/
│   │   │   ├── base.py         # Обща конфигурация
│   │   │   ├── development.py  # Debug=True, CORS *
│   │   │   └── production.py   # Debug=False, security
│   │   ├── urls.py             # Главна URL конфигурация
│   │   ├── asgi.py             # ASGI (Channels)
│   │   ├── celery.py           # Celery конфигурация
│   │   └── wsgi.py             # WSGI
│   ├── core/                   # Системно ядро
│   │   ├── models.py           # TimestampedModel (base)
│   │   ├── managers.py         # TenantQuerySet, TenantManager
│   │   ├── middleware.py       # TenantMiddleware, AuditMiddleware
│   │   ├── permissions.py      # IsTenantMember, HasRole, etc.
│   │   └── pagination.py       # StandardResultsSetPagination
│   └── apps/                   # Бизнес приложения
│       ├── tenants/            # Тенанти, обекти, устройства, потребители
│       ├── catalog/            # Каталог, категории, ценови листи
│       ├── clients/            # Клиенти, карти, сметки, лимити
│       ├── orders/             # Поръчки, смени, плащания, одит
│       ├── inventory/          # Инвентар, наличности, доставки
│       ├── fiscal/             # Фискализация (service layer)
│       ├── notifications/      # WebSocket consumer, signals
│       └── reports/            # Справки, CSV/Excel export
│
├── frontend/                   # Angular 17 SPA
│   ├── Dockerfile
│   ├── angular.json
│   ├── package.json
│   └── src/
│       └── app/
│           ├── app.routes.ts   # Routing (lazy-loaded)
│           ├── core/           # Shared services, models, guards
│           │   ├── models/     # TypeScript interfaces
│           │   ├── services/   # HTTP services
│           │   ├── guards/     # Auth, role guards
│           │   └── interceptors/ # JWT, error, loading
│           └── features/       # Feature modules
│               ├── auth/       # Login screen
│               ├── layout/     # Sidebar layout shell
│               ├── dashboard/  # KPI дашборд с графики
│               ├── pos/        # POS каса (fullscreen touch)
│               ├── catalog/    # Каталог CRUD
│               ├── orders/     # Поръчки + филтри
│               ├── clients/    # Клиенти, групи, лимити, черен списък
│               ├── inventory/  # Наличности, движения, доставчици, доставки
│               ├── reports/    # Справки с табове
│               └── settings/   # Обекти, устройства, потребители, одит лог
│
├── device_agent/               # FastAPI Device Agent
│   ├── agent.py                # Main entry point
│   ├── config.py               # Pydantic Settings
│   ├── api_client.py           # Backend HTTP client
│   ├── local_buffer.py         # SQLite offline buffer
│   ├── heartbeat.py            # Background heartbeat
│   ├── requirements.txt
│   ├── bridge/
│   │   └── routes.py           # Bridge API endpoints
│   └── printers/
│       ├── base.py             # Abstract printer interface
│       ├── datecs.py           # Datecs FP driver (stub)
│       ├── tremol.py           # Tremol ZFP driver (stub)
│       └── escpos_driver.py    # ESC/POS driver (dev/test)
│
├── nginx/
│   ├── nginx.conf              # Reverse proxy config
│   └── certs/
│       └── README.md           # SSL certificate instructions
│
└── scripts/
    ├── clovup-backup.sh        # Automated backup script
    ├── clovup-update.sh        # Auto-update script
    └── systemd-timers.md       # systemd timer setup
```

---

## Инсталация и стартиране

### Предварителни изисквания

- Docker 24+ и Docker Compose v2
- Git
- (за development) Node.js 20+ и npm

### Бърз старт (Development)

```bash
# 1. Клониране
git clone https://github.com/Andon-ov/ClovUp.git
cd ClovUp

# 2. Конфигурация
cp .env.example .env
# Редактирайте .env с вашите стойности

# 3. Стартиране
docker compose up -d

# 4. Миграции
docker compose exec backend python manage.py migrate

# 5. Създаване на суперпотребител
docker compose exec backend python manage.py createsuperuser

# 6. Frontend (dev mode)
cd frontend
npm install
npm start
# → http://localhost:4200
```

### Стартиране на backend отделно

```bash
cd backend
pip install -r requirements/dev.txt
export DJANGO_SETTINGS_MODULE=config.settings.development
python manage.py migrate
python manage.py runserver 0.0.0.0:8000
```

### Стартиране на Device Agent

```bash
cd device_agent
pip install -r requirements.txt
# Конфигурирайте .env или environment variables
python agent.py
# → http://localhost:8001
```

---

## Конфигурация

### Environment Variables (.env)

| Променлива | Описание | По подразбиране |
|------------|----------|-----------------|
| `SECRET_KEY` | Django secret key | `insecure-dev-key` |
| `DEBUG` | Debug mode | `False` |
| `ALLOWED_HOSTS` | Разрешени хостове | `localhost,127.0.0.1` |
| `DATABASE_URL` | PostgreSQL connection | — |
| `POSTGRES_DB` | Database name | `clovup` |
| `POSTGRES_USER` | Database user | `clovup` |
| `POSTGRES_PASSWORD` | Database password | — |
| `REDIS_URL` | Redis connection | `redis://redis:6379/0` |
| `CORS_ALLOWED_ORIGINS` | CORS origins | `http://localhost:4200` |
| `JWT_ACCESS_LIFETIME` | JWT token lifetime (min) | `60` |
| `JWT_REFRESH_LIFETIME` | JWT refresh lifetime (days) | `7` |
| `CELERY_BROKER_URL` | Celery broker | `redis://redis:6379/1` |
| `EMAIL_HOST` | SMTP server | — |
| `DEVICE_AGENT_URL` | Device Agent URL | `http://localhost:8001` |

### Django Settings

- **Development**: `config.settings.development` — DEBUG=True, CORS=*, verbose logging
- **Production**: `config.settings.production` — DEBUG=False, security headers, Sentry

---

## Backend API

### Автентикация

JWT (JSON Web Token) чрез `djangorestframework-simplejwt`:

```
POST /api/v1/auth/login/       → { access, refresh, user }
POST /api/v1/auth/refresh/     → { access }
POST /api/v1/auth/logout/      → blacklist refresh token
GET  /api/v1/tenants/me/       → { tenant, user profile }
```

Всички API заявки изискват `Authorization: Bearer <access_token>` header.

### API Endpoints

#### Тенанти (`/api/tenants/`)

| Метод | Endpoint | Описание |
|-------|----------|----------|
| GET | `/api/tenants/locations/` | Списък обекти |
| POST | `/api/tenants/locations/` | Създаване на обект |
| PATCH | `/api/tenants/locations/{id}/` | Редакция на обект |
| DELETE | `/api/tenants/locations/{id}/` | Изтриване на обект |
| GET | `/api/tenants/devices/` | Списък POS устройства |
| POST | `/api/tenants/devices/` | Ново устройство |
| PATCH | `/api/tenants/devices/{id}/` | Редакция |
| DELETE | `/api/tenants/devices/{id}/` | Изтриване |
| GET | `/api/tenants/users/` | Списък потребители |
| POST | `/api/tenants/users/` | Нов потребител |
| PATCH | `/api/tenants/users/{id}/` | Редакция |

#### Каталог (`/api/catalog/`)

| Метод | Endpoint | Описание |
|-------|----------|----------|
| GET | `/api/catalog/categories/` | Категории (MPTT дърво) |
| POST | `/api/catalog/categories/` | Нова категория |
| PATCH | `/api/catalog/categories/{id}/` | Редакция |
| DELETE | `/api/catalog/categories/{id}/` | Изтриване |
| GET | `/api/catalog/products/` | Продукти (с филтри) |
| POST | `/api/catalog/products/` | Нов продукт |
| PATCH | `/api/catalog/products/{id}/` | Редакция |
| DELETE | `/api/catalog/products/{id}/` | Изтриване |
| GET | `/api/catalog/price-lists/` | Ценови листи |
| POST | `/api/catalog/price-lists/` | Нова ценова листа |
| GET | `/api/catalog/product-limits/` | Продуктови лимити |

**Филтри за продукти**: `?search=`, `?category=`, `?is_active=`, `?vat_group=`, `?ordering=`

#### Клиенти (`/api/clients/`)

| Метод | Endpoint | Описание |
|-------|----------|----------|
| GET | `/api/clients/accounts/` | Клиентски сметки |
| POST | `/api/clients/accounts/` | Нова сметка |
| POST | `/api/clients/accounts/{id}/topup/` | Зареждане на баланс |
| POST | `/api/clients/accounts/{id}/block/` | Блокиране |
| GET | `/api/clients/groups/` | Клиентски групи |
| POST | `/api/clients/groups/` | Нова група |
| GET | `/api/clients/spending-limits/` | Лимити за харчене |
| POST | `/api/clients/spending-limits/` | Нов лимит |
| GET | `/api/clients/blacklist/` | Черен списък |
| POST | `/api/clients/blacklist/` | Блокиране на карта/сметка |
| DELETE | `/api/clients/blacklist/{id}/` | Премахване от черен списък |
| GET | `/api/clients/cards/` | Физически карти |

#### Поръчки (`/api/orders/`)

| Метод | Endpoint | Описание |
|-------|----------|----------|
| GET | `/api/orders/orders/` | Списък поръчки (с филтри) |
| POST | `/api/orders/orders/` | Нова поръчка (idempotent по UUID) |
| GET | `/api/orders/orders/{id}/` | Детайли |
| POST | `/api/orders/orders/{id}/void/` | Анулиране |
| POST | `/api/orders/orders/{id}/add_payment/` | Добавяне на плащане |
| GET | `/api/orders/shifts/` | Списък смени |
| POST | `/api/orders/shifts/` | Отваряне на смяна |
| POST | `/api/orders/shifts/{id}/close/` | Затваряне на смяна |
| GET | `/api/orders/cash-operations/` | Каса операции |
| POST | `/api/orders/cash-operations/` | Ново служ. въвеждане/извеждане |
| GET | `/api/orders/audit-logs/` | Одитен лог |
| GET | `/api/orders/z-reports/` | Z-отчети |

**Филтри за поръчки**: `?search=`, `?status=`, `?date_from=`, `?date_to=`, `?shift=`

#### Инвентар (`/api/inventory/`)

| Метод | Endpoint | Описание |
|-------|----------|----------|
| GET | `/api/inventory/stocks/` | Наличности |
| GET | `/api/inventory/stocks/low-stock/` | Нисък запас |
| POST | `/api/inventory/stocks/adjust/` | Корекция |
| GET | `/api/inventory/movements/` | Движения |
| GET | `/api/inventory/suppliers/` | Доставчици |
| POST | `/api/inventory/suppliers/` | Нов доставчик |
| PATCH | `/api/inventory/suppliers/{id}/` | Редакция |
| DELETE | `/api/inventory/suppliers/{id}/` | Изтриване |
| GET | `/api/inventory/deliveries/` | Доставки |
| POST | `/api/inventory/deliveries/` | Нова доставка |
| POST | `/api/inventory/deliveries/{id}/receive/` | Получаване |

#### Фискализация (`/api/fiscal/`)

| Метод | Endpoint | Описание |
|-------|----------|----------|
| POST | `/api/fiscal/receipt/` | Печат на фискален бон |
| POST | `/api/fiscal/storno/` | Сторно |
| POST | `/api/fiscal/safe-in/` | Служебно въвеждане |
| POST | `/api/fiscal/safe-out/` | Служебно извеждане |
| POST | `/api/fiscal/x-report/` | X-отчет |
| POST | `/api/fiscal/z-report/` | Z-отчет |
| POST | `/api/fiscal/reprint/` | Повторен печат |
| GET | `/api/fiscal/status/` | Статус на принтера |

#### Справки (`/api/reports/`)

| Метод | Endpoint | Описание |
|-------|----------|----------|
| GET | `/api/reports/dashboard-kpis/` | KPI за дашборд |
| GET | `/api/reports/sales-by-date/` | Продажби по дата |
| GET | `/api/reports/sales-by-hour/` | Продажби по час |
| GET | `/api/reports/top-products/` | Топ продукти |
| GET | `/api/reports/vat-breakdown/` | ДДС разбивка |
| GET | `/api/reports/payment-breakdown/` | Плащания по метод |
| GET | `/api/reports/z-report-history/` | История на Z-отчети |
| GET | `/api/reports/shift-report/` | Справка по смяна |
| GET | `/api/reports/export-csv/` | CSV export |
| GET | `/api/reports/export-excel/` | Excel export |

### WebSocket

```
ws://hostname/ws/dashboard/?token=<JWT>
```

**Events**:
- `order_created` — нова поръчка
- `order_paid` — платена поръчка
- `order_voided` — анулирана поръчка
- `shift_opened` / `shift_closed` — смяна
- `alert` — системна аларма (нисък запас, etc.)

### Пагинация

Всички list endpoints използват `StandardResultsSetPagination`:

```json
{
  "count": 150,
  "next": "http://host/api/catalog/products/?page=2",
  "previous": null,
  "results": [...]
}
```

По подразбиране 50 резултата на страница, максимум 200.

---

## Frontend

### Routing структура

| Path | Компонент | Описание |
|------|-----------|----------|
| `/login` | LoginComponent | Вход в системата |
| `/pos` | PosComponent | POS каса (fullscreen, без sidebar) |
| `/dashboard` | DashboardComponent | KPI табло |
| `/catalog` | CatalogListComponent | Каталог CRUD |
| `/orders` | OrdersListComponent | Поръчки с филтри |
| `/clients` | ClientsListComponent | Клиенти (4 таба) |
| `/inventory` | InventoryListComponent | Инвентар (4 таба) |
| `/reports` | ReportsDashboardComponent | Справки (4 таба) |
| `/settings` | SettingsPageComponent | Настройки (4 таба) |

### Компоненти по модул

#### POS Каса (`/pos`)
Fullscreen touch-optimized интерфейс:
- **Продуктова матрица** (65% ширина) — бутони по категория, мин. 60×60px
- **Количка** (35% ширина) — артикули, количество +/−, отстъпка, бележка
- **Категории** — хоризонтални табове
- **Плащане** — модален диалог с методи: В брой, Карта, Сметка, Ваучер, Безкасово, Смесено
- **Служебни операции** — въвеждане / извеждане на каса
- **Търсене** — по баркод или име на артикул

#### Dashboard (`/dashboard`)
- 4 KPI карти: Продажби днес, Поръчки, Среден чек, Активна смяна
- Графика: продажби по час (line chart)
- Графика: продажби за последните 30 дни (bar chart)
- Топ 5 продукти (pie chart)

#### Каталог (`/catalog`)
- Таблица с продукти, пагинация, търсене
- CRUD модал за създаване/редакция
- Категории, цена, ДДС, баркод, активен статус

#### Клиенти (`/clients`)
4 таба:
1. **Клиентски сметки** — име, група, карта, баланс, статус, top-up, block
2. **Клиентски групи** — име, кредит, овърдрафт, отстъпка
3. **Лимити** — име, сума, тип (дневен/седмичен/месечен)
4. **Черен списък** — карта, сметка, причина, премахване

#### Инвентар (`/inventory`)
4 таба:
1. **Наличности** — продукт, обект, количество, мин. количество, статус
2. **Движения** — дата, продукт, тип, количество, бележка
3. **Доставчици** — име, фирма, ЕИК, контакт, CRUD
4. **Доставки** — дата, фактура №, доставчик, сума, получаване

#### Справки (`/reports`)
4 таба:
1. **Продажби** — по дата/час, графика + таблица
2. **ДДС** — разбивка по ДДС групи
3. **Плащания** — по метод на плащане
4. **Z-отчети** — история на Z-отчетите

#### Настройки (`/settings`)
4 таба:
1. **Обекти** — име, адрес, град, Н-18 обект
2. **Устройства** — логическо име, дисплей, онлайн статус
3. **Потребители** — потребител, имена, имейл, роля, активен
4. **Одитен лог** — дата, потребител, действие, модел, IP, промени

### Core Services

| Service | Файл | Описание |
|---------|------|----------|
| `AuthService` | `auth.service.ts` | Login, logout, JWT, user state |
| `CatalogService` | `catalog.service.ts` | Products, categories CRUD |
| `OrdersService` | `orders.service.ts` | Orders, shifts, audit logs |
| `ClientsService` | `clients.service.ts` | Accounts, groups, limits, blacklist |
| `InventoryService` | `inventory.service.ts` | Stocks, movements, suppliers, deliveries |
| `ReportsService` | `reports.service.ts` | Dashboard KPIs, reports, export |
| `TenantService` | `tenant.service.ts` | Locations, devices, users |
| `PosService` | `pos.service.ts` | POS-specific: shifts, orders, payments, fiscal |
| `WebSocketService` | `websocket.service.ts` | WebSocket connection |
| `NotificationService` | `notification.service.ts` | PrimeNG Toast notifications |

### Interceptors

| Interceptor | Описание |
|-------------|----------|
| `JwtInterceptor` | Добавя `Authorization: Bearer` header |
| `ErrorInterceptor` | Глобална обработка на HTTP грешки |
| `LoadingInterceptor` | Показва/скрива глобален loading индикатор |

### Guards

| Guard | Описание |
|-------|----------|
| `authGuard` | Проверява дали потребителят е логнат |
| `roleGuard` | Проверява дали потребителят има нужната роля |

---

## Device Agent

Device Agent е FastAPI приложение, което работи **локално на всеки POS терминал** (localhost:8001). То служи за мост между Angular POS фронтенда и физическия фискален принтер.

### Архитектура

```
Angular POS UI  ──HTTP──►  Device Agent (:8001)  ──Serial──►  Фискален принтер
                                  │
                                  ├── Heartbeat → Backend API
                                  └── Local Buffer (SQLite) → Retry queue
```

### API Endpoints

| Метод | Endpoint | Описание |
|-------|----------|----------|
| POST | `/api/print-receipt` | Печат на фискален бон |
| POST | `/api/cash-operation` | Служ. въвеждане/извеждане |
| POST | `/api/report` | X или Z отчет |
| POST | `/api/reprint` | Повторен печат |
| GET | `/api/printer-status` | Статус на принтера |
| GET | `/health` | Health check |

### Поддържани принтери

| Драйвер | Принтер | Статус |
|---------|---------|--------|
| `datecs` | Datecs DP-25, DP-55, FP-700 | Stub (нужен real protocol) |
| `tremol` | Tremol FP01-KL, S25 | Stub (нужен ZFP SDK) |
| `escpos` | Generic ESC/POS | Simulated (dev mode) |

### Конфигурация

```env
CLOVUP_BACKEND_URL=http://192.168.1.100:8000
CLOVUP_DEVICE_TOKEN=<jwt_token>
CLOVUP_PRINTER_TYPE=datecs
CLOVUP_PRINTER_PORT=/dev/ttyUSB0
CLOVUP_HEARTBEAT_INTERVAL=30
```

### Offline режим

Когато backend-ът е недостъпен, Device Agent буферира бонове в локална SQLite база. При възстановяване на връзката, heartbeat задачата автоматично изпраща буферираните данни.

---

## Deploy в продукция

### Docker Compose Production

```bash
# 1. Подготовка
cp .env.example .env
# Редактирайте .env с production стойности

# 2. SSL сертификати
# Поставете в nginx/certs/:
#   fullchain.pem
#   privkey.pem
# Или използвайте Let's Encrypt (вж. nginx/certs/README.md)

# 3. Build и стартиране
docker compose -f docker-compose.prod.yml up -d --build

# 4. Миграции
docker compose -f docker-compose.prod.yml exec backend python manage.py migrate

# 5. Създаване на admin
docker compose -f docker-compose.prod.yml exec backend python manage.py createsuperuser

# 6. Проверка
docker compose -f docker-compose.prod.yml ps
```

### Production Services

| Service | Порт | Описание |
|---------|------|----------|
| `db` | 5432 | PostgreSQL 16 |
| `redis` | 6379 | Redis 7 |
| `backend` | 8000 | Gunicorn (Django) |
| `daphne` | 8002 | Daphne (WebSocket) |
| `celery` | — | Celery worker |
| `celery-beat` | — | Celery scheduler |
| `frontend` | 80/443 | Nginx + Angular static |

### Nginx конфигурация

Nginx е конфигуриран като reverse proxy:
- `/` → Angular static files
- `/api/` → Gunicorn backend (:8000)
- `/ws/` → Daphne WebSocket (:8002)
- gzip компресия за статични файлове
- SSL (при наличие на сертификати)

### Мониторинг

```bash
# Логове на всички сервизи
docker compose -f docker-compose.prod.yml logs -f

# Логове на конкретен сервиз
docker compose -f docker-compose.prod.yml logs -f backend

# Статус
docker compose -f docker-compose.prod.yml ps

# Django shell
docker compose -f docker-compose.prod.yml exec backend python manage.py shell
```

---

## Backup и възстановяване

### Автоматичен backup

```bash
# Ръчен backup
./scripts/clovup-backup.sh

# Backup в зададена директория
./scripts/clovup-backup.sh /path/to/backups
```

Скриптът:
1. Dump на PostgreSQL базата
2. Копиране на `.env` файла
3. Копиране на nginx конфигурация
4. Копиране на docker-compose файлове
5. Компресиране в `.tar.gz`
6. Изтриване на стари backup-и (пази последните 7)

### Автоматичен backup (systemd timer)

```bash
sudo cp scripts/clovup-backup.service /etc/systemd/system/
sudo cp scripts/clovup-backup.timer   /etc/systemd/system/
sudo systemctl enable --now clovup-backup.timer
```

Backup-ът се изпълнява всеки ден в 03:00.

### Възстановяване от backup

```bash
# 1. Разархивирайте
tar -xzf clovup_backup_20260228_030000.tar.gz
cd clovup_backup_20260228_030000

# 2. Възстановете .env
cp .env /opt/clovup/.env

# 3. Стартирайте базата
docker compose up -d db
sleep 10

# 4. Възстановете базата
cat db.sql | docker compose exec -T db psql -U clovup clovup

# 5. Стартирайте всичко
docker compose up -d
```

### Автоматично обновяване

```bash
# Обновяване с автоматичен backup
./scripts/clovup-update.sh

# Обновяване без backup
./scripts/clovup-update.sh --no-backup
```

Стъпки:
1. Pre-update backup
2. `git pull` (fast-forward)
3. Docker rebuild
4. Django migrate
5. Collectstatic
6. Restart + health check

---

## Разработка

### Структура на кода

#### Backend conventions

- **Models**: Наследяват `TimestampedModel` за `created_at`/`updated_at`
- **Managers**: Бизнес моделите използват `TenantManager` за автоматично филтриране по tenant
- **Serializers**: DRF serializers с `read_only` за computed полета
- **Views**: `ModelViewSet` + custom actions (`@action`)
- **Permissions**: Комбинация от `IsTenantMember` + role-based (`HasRole`, `IsOwner`, `IsManagerOrAbove`)
- **Middleware**: `TenantMiddleware` inject-ва `request.tenant`, `AuditMiddleware` записва промени

#### Frontend conventions

- **Standalone components**: Всички компоненти са standalone (Angular 17+)
- **Signals**: Използват Angular signals за state management
- **Lazy loading**: Всички feature модули се зареждат lazy чрез `loadChildren`/`loadComponent`
- **PrimeNG**: UI компоненти, DataTable за таблици, Dialog за модали
- **Services**: HttpClient + RxJS Observable pattern

### Полезни команди

```bash
# Backend
cd backend
python manage.py makemigrations    # Генериране на миграции
python manage.py migrate           # Прилагане на миграции
python manage.py shell             # Interactive shell
python manage.py createsuperuser   # Създаване на admin

# Frontend
cd frontend
npm start                          # Dev сървър (:4200)
npm run build                      # Production build
ng generate component features/X   # Нов компонент

# Docker
docker compose up -d               # Стартиране
docker compose down                # Спиране
docker compose logs -f backend     # Логове
docker compose exec backend bash   # Shell в контейнера
```

### Database Schema (основни модели)

```
Tenant ──< Location ──< POSDevice
   │
   ├──< TenantUser (tenant + user + role)
   │
   ├──< ProductCategory (MPTT)
   ├──< Product ──< PriceListItem
   │
   ├──< ClientGroup ──< ClientAccount ──< Card
   │         │                    │
   │         ├──< SpendingLimit   ├──< Blacklist
   │         └──< DeviceClientGroup
   │
   ├──< Shift ──< CashOperation
   │     │
   │     └──< Order ──< OrderItem
   │            │
   │            ├──< Payment
   │            └──< FiscalReceipt
   │
   ├──< Stock ──< StockMovement
   ├──< Supplier ──< Delivery ──< DeliveryItem
   │
   ├──< AuditLog
   ├──< DailyZReport
   ├──< SystemConfig
   ├──< DeviceSettings
   └──< Alert
```

---

## Тестове

### Backend тестове

```bash
cd backend
python manage.py test                    # Всички тестове
python manage.py test apps.catalog       # Тестове за каталог
python manage.py test --verbosity=2      # Verbose
```

### Frontend тестове

```bash
cd frontend
npm test                                 # Unit тестове (Karma)
npm run test -- --watch=false            # CI mode
```

### API тестове (cURL примери)

```bash
# Login
curl -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}'

# Get products
curl http://localhost:8000/api/catalog/products/ \
  -H "Authorization: Bearer <token>"

# Create order
curl -X POST http://localhost:8000/api/orders/orders/ \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "uuid": "550e8400-e29b-41d4-a716-446655440000",
    "receipt_sequence": 1,
    "order_type": "RETAIL",
    "items": [
      {"product_id": 1, "quantity": 2, "discount_pct": 0}
    ]
  }'
```

---

## Лиценз

Copyright (c) 2026 Andon-ov. Всички права запазени.

Proprietary software. Неоторизираното копиране, разпространение или модификация е забранено.
