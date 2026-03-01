# ClovUp Device Agent — Ръководство

> Инсталиране, конфигуриране и разработка на Device Agent за фискални принтери.

---

## Съдържание

- [Преглед](#преглед)
- [Архитектура](#архитектура)
- [Инсталация](#инсталация)
- [Конфигурация](#конфигурация)
- [API Endpoints](#api-endpoints)
- [Поддържани принтери](#поддържани-принтери)
- [Offline режим](#offline-режим)
- [Heartbeat](#heartbeat)
- [Разработка на нов драйвер](#разработка-на-нов-драйвер)
- [Тестов режим (ESC/POS Simulation)](#тестов-режим)
- [Troubleshooting](#troubleshooting)

---

## Преглед

**Device Agent** е FastAPI микросервиз, който работи **локално на всеки POS терминал (касов апарат)**. Той е мостът между Angular POS фронтенда (работещ в браузъра) и физическия фискален принтер, свързан към терминала чрез серийен порт (RS-232 / USB-to-serial).

### Основни задачи

1. **Печат на фискални бонове** — приема JSON от POS UI, форматира и изпраща към фискален принтер
2. **Фискални операции** — X/Z отчети, служебно въвеждане/извеждане
3. **Heartbeat** — периодично известява backend-а, че устройството е online
4. **Offline buffer** — при липса на връзка с backend, буферира бонове в SQLite

### Какво НЕ прави Device Agent

- Не съхранява бизнес данни (продукти, клиенти, поръчки)
- Не обработва плащания
- Не управлява автентикация (получава token от backend)

---

## Архитектура

```
 ┌──────────────────────────────────────────────────────┐
 │                 POS Терминал (Hardware)                │
 │                                                       │
 │  ┌─────────────┐    HTTP     ┌──────────────────┐    │
 │  │  Chrome /    │ ──────────►│  Device Agent    │    │
 │  │  Chromium    │  localhost  │  FastAPI :8001   │    │
 │  │  (POS UI)   │   :8001    │                   │    │
 │  └─────────────┘            │  ┌──────────────┐ │    │
 │                              │  │ Printer      │ │    │
 │                              │  │ Driver       │ │    │
 │                              │  │ (serial)     │ │    │
 │                              │  └──────┬───────┘ │    │
 │                              │         │         │    │
 │                              │  ┌──────▼───────┐ │    │
 │                              │  │ SQLite       │ │    │
 │                              │  │ (buffer)     │ │    │
 │                              │  └──────────────┘ │    │
 │                              └──────────┬────────┘    │
 │                                         │             │
 └─────────────────────────────────────────┼─────────────┘
                                           │ HTTP (heartbeat)
                                           │ + fiscal callback
                                    ┌──────▼───────┐
                                    │   Backend    │
                                    │   Server     │
                                    │   (remote)   │
                                    └──────────────┘
```

### Файлова структура

```
device_agent/
├── agent.py              # Main entry point (FastAPI app + lifespan)
├── config.py             # Pydantic Settings конфигурация
├── api_client.py         # HTTP клиент към backend
├── local_buffer.py       # SQLite offline buffer
├── heartbeat.py          # APScheduler heartbeat task
├── requirements.txt      # Python зависимости
│
├── bridge/
│   ├── __init__.py
│   └── routes.py         # API endpoints (print, report, status)
│
└── printers/
    ├── __init__.py
    ├── base.py           # Abstract BasePrinter + factory
    ├── datecs.py          # Datecs FP драйвер (stub)
    ├── tremol.py          # Tremol ZFP драйвер (stub)
    └── escpos_driver.py   # ESC/POS драйвер (dev/test)
```

---

## Инсталация

### Предварителни изисквания

- Python 3.11+
- pip
- (за реален принтер) Серийен порт достъп (`/dev/ttyUSB0` или `COM3`)

### Linux (Ubuntu/Debian)

```bash
# 1. Клониране (ако още не е)
cd /opt/clovup/device_agent

# 2. Virtual environment
python3 -m venv venv
source venv/bin/activate

# 3. Зависимости
pip install -r requirements.txt

# 4. Серийни портове (Linux) — добавете потребителя в dialout група
sudo usermod -aG dialout $USER
# Re-login

# 5. Конфигурация
export CLOVUP_BACKEND_URL=http://192.168.1.100:8000
export CLOVUP_DEVICE_TOKEN=<jwt-token>
export CLOVUP_PRINTER_TYPE=escpos  # или datecs, tremol
export CLOVUP_PRINTER_PORT=/dev/ttyUSB0

# 6. Стартиране
python agent.py
# → http://localhost:8001
```

### Windows

```powershell
# 1. Навигация
cd C:\ClovUp\device_agent

# 2. Virtual environment
python -m venv venv
.\venv\Scripts\Activate

# 3. Зависимости
pip install -r requirements.txt

# 4. Конфигурация
$env:CLOVUP_BACKEND_URL = "http://192.168.1.100:8000"
$env:CLOVUP_DEVICE_TOKEN = "<jwt-token>"
$env:CLOVUP_PRINTER_TYPE = "escpos"
$env:CLOVUP_PRINTER_PORT = "COM3"

# 5. Стартиране
python agent.py
```

### Autostart (systemd)

```ini
# /etc/systemd/system/clovup-agent.service
[Unit]
Description=ClovUp Device Agent
After=network.target

[Service]
Type=simple
User=pos
WorkingDirectory=/opt/clovup/device_agent
Environment=CLOVUP_BACKEND_URL=http://192.168.1.100:8000
Environment=CLOVUP_DEVICE_TOKEN=<token>
Environment=CLOVUP_PRINTER_TYPE=datecs
Environment=CLOVUP_PRINTER_PORT=/dev/ttyUSB0
ExecStart=/opt/clovup/device_agent/venv/bin/python agent.py
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable --now clovup-agent
sudo systemctl status clovup-agent
```

---

## Конфигурация

Всички настройки се задават чрез environment variables с префикс `CLOVUP_`:

| Variable | Описание | Default |
|----------|----------|---------|
| `CLOVUP_BACKEND_URL` | URL на backend сървъра | `http://localhost:8000` |
| `CLOVUP_DEVICE_TOKEN` | JWT API token за устройството | — |
| `CLOVUP_TENANT_ID` | ID на тенанта | `1` |
| `CLOVUP_DEVICE_ID` | ID на POS устройството в DB | `1` |
| `CLOVUP_HOST` | IP адрес за listen | `0.0.0.0` |
| `CLOVUP_PORT` | Порт | `8001` |
| `CLOVUP_PRINTER_TYPE` | Тип принтер | `escpos` |
| `CLOVUP_PRINTER_PORT` | Серийен порт | `/dev/ttyUSB0` |
| `CLOVUP_PRINTER_BAUDRATE` | Baudrate | `115200` |
| `CLOVUP_HEARTBEAT_INTERVAL` | Heartbeat интервал (секунди) | `30` |
| `CLOVUP_BUFFER_DB_PATH` | Път до SQLite DB | `local_buffer.db` |

### Получаване на DEVICE_TOKEN

Token-ът се генерира при създаване на POS устройство в BOS → Settings → Devices. Полето `api_token` съдържа уникален токен.

---

## API Endpoints

Всички endpoints на агент слушат на `http://localhost:8001`.

### GET `/health`

Health check.

```json
{"status": "ok"}
```

---

### POST `/api/print-receipt`

Печат на фискален бон.

**Request Body**:
```json
{
  "order_id": 123,
  "idempotency_key": "uuid-unique-key",
  "items": [
    {
      "name": "Coca-Cola 330ml",
      "quantity": 2,
      "price": 2.50,
      "vat_group": "B",
      "discount_pct": 0
    },
    {
      "name": "Пица Маргарита",
      "quantity": 1,
      "price": 12.00,
      "vat_group": "B",
      "discount_pct": 10
    }
  ],
  "payments": [
    {
      "method": "CASH",
      "amount": 16.80
    }
  ],
  "is_storno": false,
  "storno_reason": null
}
```

**Response 200**:
```json
{
  "status": "printed",
  "receipt_number": "0001234",
  "fiscal_memory": "23456"
}
```

**Response 500**:
```json
{
  "status": "error",
  "error": "Printer not connected"
}
```

---

### POST `/api/cash-operation`

Служебно въвеждане/извеждане.

```json
{
  "operation_type": "SERVICE_IN",
  "amount": 100.00
}
```

---

### POST `/api/report`

X или Z отчет.

```json
{
  "report_type": "X"
}
```

или

```json
{
  "report_type": "Z"
}
```

---

### POST `/api/reprint`

Повторен печат на последния бон.

```json
{}
```

---

### GET `/api/printer-status`

Статус на принтера.

```json
{
  "connected": true,
  "printer_type": "datecs",
  "port": "/dev/ttyUSB0",
  "fiscal_memory": "23456",
  "device_serial": "DT123456",
  "paper_status": "ok"
}
```

---

## Поддържани принтери

### Datecs FP

**Модели**: DP-25, DP-55, FP-700, FP-700X

**Протокол**: Datecs FP Protocol (binary, serial)

**Статус**: Stub — необходима е реална имплементация на протокола.

Ключови характеристики:
- Комуникация чрез RS-232 серийен порт (115200 baud)
- Binary protocol с STX/ETX framing
- Sequence number tracking
- CRC16 checksum

```python
# Пример за Datecs FP команда:
# STX (0x01) + LEN + SEQ + CMD + DATA + POSTAMBLE + ETX (0x03)
```

**Файл**: `printers/datecs.py`

---

### Tremol ZFP

**Модели**: FP01-KL, S25, M20

**Протокол**: Tremol ZFP SDK

**Статус**: Stub — необходим е Tremol ZFP SDK.

**Файл**: `printers/tremol.py`

---

### ESC/POS (Generic)

**Модели**: Всички ESC/POS съвместими принтери + Simulation mode

**Статус**: Работещ (simulation mode за development/testing)

Characteristics:
- Simulation mode: печат в stdout вместо серийд порт
- Форматиране на бон (ширина 42 символа)
- Последователна номерация на бонове
- Пълен текстов изход (заглавка, артикули, ДДС разбивка, плащания)

**Файл**: `printers/escpos_driver.py`

---

## Offline режим

При загуба на връзка с backend сървъра, Device Agent буферира фискалните данни в локална SQLite база.

### Как работи

1. Бонът се отпечатва на принтера (offline или online)
2. Данните се записват в SQLite (`local_buffer.db`)
3. Heartbeat задачата (на всеки N секунди) проверява за pending записи
4. При успешна връзка, данните се изпращат към backend
5. При успех — маркират се като `sent`
6. При грешка — `retry_count` се увеличава (max 10 опита)

### SQLite schema

```sql
CREATE TABLE receipts (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id   INTEGER NOT NULL,
    payload    TEXT    NOT NULL,    -- JSON
    status     TEXT    DEFAULT 'pending',  -- pending | sent | failed
    retry_count INTEGER DEFAULT 0,
    created_at TEXT    DEFAULT CURRENT_TIMESTAMP,
    sent_at    TEXT
);
```

### Ръчно управление

```python
from local_buffer import init_db, get_pending, flush_pending

# Инициализация
init_db()

# Вижте pending записи
pending = get_pending()
print(f"Pending receipts: {len(pending)}")

# Ръчно flush
from api_client import BackendClient
client = BackendClient()
flush_pending(client)
```

---

## Heartbeat

APScheduler BackgroundScheduler, който:

1. Изпраща heartbeat на backend (`POST /api/v1/fiscal/callback/` или dedicated heartbeat endpoint)
2. Flush-ва offline buffer (изпраща pending записи)

**Интервал**: по подразбиране 30 секунди (конфигурируемо чрез `CLOVUP_HEARTBEAT_INTERVAL`)

```python
# heartbeat.py
scheduler = BackgroundScheduler()

def heartbeat_tick():
    client = BackendClient()
    # 1. Send heartbeat
    client.heartbeat()
    # 2. Flush pending receipts
    flush_pending(client)

scheduler.add_job(heartbeat_tick, 'interval', seconds=settings.heartbeat_interval)
```

---

## Разработка на нов драйвер

За да добавите поддръжка на нов фискален принтер:

### 1. Създайте файл в `printers/`

```python
# printers/my_printer.py
from .base import BasePrinter

class MyPrinterDriver(BasePrinter):
    """Driver for MyPrinter fiscal printer."""

    def connect(self):
        """Open serial connection to the printer."""
        import serial
        self.serial = serial.Serial(
            port=self.port,
            baudrate=self.baudrate,
            timeout=5,
        )

    def disconnect(self):
        """Close serial connection."""
        if hasattr(self, 'serial') and self.serial.is_open:
            self.serial.close()

    def print_receipt(self, items, payments, **kwargs):
        """
        Print a fiscal receipt.

        Args:
            items: List of dicts with keys:
                - name (str): Product name
                - quantity (float): Quantity
                - price (float): Unit price
                - vat_group (str): A, B, C, D
                - discount_pct (float): Discount %
            payments: List of dicts with keys:
                - method (str): CASH, CARD, etc.
                - amount (float): Payment amount

        Returns:
            dict: {receipt_number, fiscal_memory, device_serial}
        """
        self.connect()
        try:
            # Open fiscal receipt
            self._send_command(...)

            # Add items
            for item in items:
                self._send_command(...)

            # Add payments
            for payment in payments:
                self._send_command(...)

            # Close receipt
            result = self._send_command(...)

            return {
                'receipt_number': result['number'],
                'fiscal_memory': result['fm'],
                'device_serial': result['serial'],
            }
        finally:
            self.disconnect()

    def print_report(self, report_type):
        """Print X or Z report."""
        ...

    def cash_operation(self, op_type, amount):
        """Service IN/OUT."""
        ...

    def get_status(self):
        """Get printer status."""
        ...

    def reprint_last(self):
        """Reprint last receipt."""
        ...
```

### 2. Регистрирайте в factory

В `printers/base.py`, добавете нов тип:

```python
def get_printer(printer_type: str, port: str, baudrate: int) -> BasePrinter:
    if printer_type == 'datecs':
        from .datecs import DatecsFPDriver
        return DatecsFPDriver(port, baudrate)
    elif printer_type == 'tremol':
        from .tremol import TremolDriver
        return TremolDriver(port, baudrate)
    elif printer_type == 'escpos':
        from .escpos_driver import EscPosDriver
        return EscPosDriver(port, baudrate)
    elif printer_type == 'myprinter':          # ← Добавете тук
        from .my_printer import MyPrinterDriver
        return MyPrinterDriver(port, baudrate)
    else:
        raise ValueError(f"Unknown printer type: {printer_type}")
```

### 3. Тестирайте

```bash
export CLOVUP_PRINTER_TYPE=myprinter
export CLOVUP_PRINTER_PORT=/dev/ttyUSB0
python agent.py
```

---

## Тестов режим

ESC/POS драйверът поддържа **simulation mode** — печат в терминала вместо реален принтер.

```bash
export CLOVUP_PRINTER_TYPE=escpos
export CLOVUP_PRINTER_PORT=simulation
python agent.py
```

При печат на бон, изходът се показва в конзолата:

```
==========================================
          ТЕСТОВ ОБЕКТ
      бул. Витоша 100, София
          ЕИК: 123456789
==========================================
Бон №: 000001
Дата: 28.02.2026 14:30:00
------------------------------------------
Coca-Cola 330ml
  2.000 x     2.50           5.00 Б
Пица Маргарита
  1.000 x    12.00   -10%   10.80 Б
------------------------------------------
СУМА:                       15.80
ДДС Б (20%):                 2.63
------------------------------------------
В БРОЙ:                     15.80
==========================================
        Благодарим Ви!
==========================================
```

---

## Troubleshooting

### Принтерът не е открит

```bash
# Linux — проверете серийни портове
ls -la /dev/ttyUSB*
ls -la /dev/ttyS*

# Проверете правата
groups $USER  # трябва да включва 'dialout'

# Windows — Device Manager → Ports (COM & LPT)
```

### Permission denied на серийния порт

```bash
# Linux
sudo usermod -aG dialout $USER
# Re-login!
```

### Agent не може да достигне backend

```bash
# Проверете мрежата
curl -s $CLOVUP_BACKEND_URL/api/v1/reports/dashboard/

# Проверете firewall
sudo ufw status

# Ако използвате VPN, проверете WireGuard
sudo wg show
```

### Бонове остават в buffer

```bash
# Проверете SQLite
sqlite3 local_buffer.db "SELECT COUNT(*), status FROM receipts GROUP BY status;"

# Ръчно flush
python -c "
from local_buffer import init_db, get_pending
init_db()
pending = get_pending()
print(f'Pending: {len(pending)}')
for r in pending:
    print(f'  ID={r[0]} order={r[1]} status={r[3]} retries={r[4]}')
"
```

### Agent crashi-ва

```bash
# Проверете логовете
journalctl -u clovup-agent -f

# Стартирайте ръчно с verbose
python agent.py 2>&1 | tee agent.log
```
