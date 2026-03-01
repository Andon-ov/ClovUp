# ClovUp — Deployment Guide

> Ръководство за инсталиране, конфигуриране и поддръжка на ClovUp в продукция.

---

## Съдържание

- [Системни изисквания](#системни-изисквания)
- [Подготовка на сървъра](#подготовка-на-сървъра)
- [Docker Compose инсталация](#docker-compose-инсталация)
- [SSL / Let's Encrypt](#ssl--lets-encrypt)
- [Environment Variables](#environment-variables)
- [Nginx конфигурация](#nginx-конфигурация)
- [Начална настройка](#начална-настройка)
- [VPN (WireGuard)](#vpn-wireguard)
- [Backup стратегия](#backup-стратегия)
- [Автоматично обновяване](#автоматично-обновяване)
- [Мониторинг](#мониторинг)
- [Troubleshooting](#troubleshooting)
- [Сигурност](#сигурност)

---

## Системни изисквания

### Минимални (1 обект, до 5 устройства)

| Ресурс | Стойност |
|--------|----------|
| CPU | 2 vCPU |
| RAM | 4 GB |
| Дисково простр. | 40 GB SSD |
| OS | Ubuntu 22.04 / Debian 12 |
| Мрежа | 100 Mbps |

### Препоръчителни (до 5 обекта, до 20 устройства)

| Ресурс | Стойност |
|--------|----------|
| CPU | 4 vCPU |
| RAM | 8 GB |
| Дисково простр. | 100 GB SSD |
| OS | Ubuntu 24.04 LTS |
| Мрежа | 1 Gbps |

### Софтуер

- Docker 24+ с Docker Compose v2
- Git
- (опционално) WireGuard за VPN

---

## Подготовка на сървъра

### Ubuntu 24.04 LTS

```bash
# 1. Обновяване на системата
sudo apt update && sudo apt upgrade -y

# 2. Инсталиране на Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# Re-login или `newgrp docker`

# 3. Инсталиране на Docker Compose (вече вградено в Docker 24+)
docker compose version

# 4. Инсталиране на Git
sudo apt install -y git

# 5. Създаване на директория
sudo mkdir -p /opt/clovup
sudo chown $USER:$USER /opt/clovup

# 6. Клониране на проекта
cd /opt/clovup
git clone https://github.com/Andon-ov/ClovUp.git .

# 7. Firewall
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

---

## Docker Compose инсталация

### 1. Конфигурация

```bash
cd /opt/clovup
cp .env.example .env
nano .env
```

Задължителни настройки в `.env`:

```env
# === ЗАДЪЛЖИТЕЛНИ ===
SECRET_KEY=<генерирайте-силен-ключ-40-символа>
POSTGRES_DB=clovup
POSTGRES_USER=clovup
POSTGRES_PASSWORD=<силна-парола>
DATABASE_URL=postgres://clovup:<password>@db:5432/clovup
REDIS_URL=redis://redis:6379/0
CELERY_BROKER_URL=redis://redis:6379/1

# === NETWORKING ===
ALLOWED_HOSTS=your-domain.com,localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=https://your-domain.com

# === DJANGO ===
DJANGO_SETTINGS_MODULE=config.settings.production
DEBUG=False

# === JWT ===
JWT_ACCESS_LIFETIME=60
JWT_REFRESH_LIFETIME=7
```

Генериране на SECRET_KEY:

```bash
python3 -c "import secrets; print(secrets.token_urlsafe(50))"
```

### 2. Build & Start

```bash
# Build всички контейнери
docker compose -f docker-compose.prod.yml build

# Стартиране
docker compose -f docker-compose.prod.yml up -d

# Проверка
docker compose -f docker-compose.prod.yml ps
```

### 3. Първоначална настройка

```bash
# Миграции
docker compose -f docker-compose.prod.yml exec backend python manage.py migrate

# Collectstatic
docker compose -f docker-compose.prod.yml exec backend python manage.py collectstatic --noinput

# Създаване на суперпотребител
docker compose -f docker-compose.prod.yml exec backend python manage.py createsuperuser
```

### 4. Проверка на здравето

```bash
# Health check
curl -s http://localhost:8000/api/v1/reports/dashboard/ -H "Authorization: Bearer <token>"

# Логове
docker compose -f docker-compose.prod.yml logs -f --tail=50
```

---

## SSL / Let's Encrypt

### Вариант 1: Let's Encrypt (безплатен сертификат)

```bash
# 1. Инсталирайте certbot
sudo apt install -y certbot

# 2. Спрете frontend контейнера временно
docker compose -f docker-compose.prod.yml stop frontend

# 3. Получете сертификат
sudo certbot certonly --standalone -d your-domain.com

# 4. Копирайте сертификатите
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem nginx/certs/
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem nginx/certs/
sudo chown $USER:$USER nginx/certs/*.pem

# 5. Обновете nginx.conf за SSL (вж. секция Nginx)

# 6. Рестартирайте
docker compose -f docker-compose.prod.yml up -d
```

### Автоматично обновяване на Let's Encrypt

```bash
# Добавете в crontab
sudo crontab -e
```

```cron
0 3 1 */2 * certbot renew --quiet && cp /etc/letsencrypt/live/your-domain.com/fullchain.pem /opt/clovup/nginx/certs/ && cp /etc/letsencrypt/live/your-domain.com/privkey.pem /opt/clovup/nginx/certs/ && docker compose -f /opt/clovup/docker-compose.prod.yml restart frontend
```

### Вариант 2: Собствен сертификат

Поставете файловете в `nginx/certs/`:
- `fullchain.pem` — пълната верига на сертификата
- `privkey.pem` — частния ключ

---

## Environment Variables

### Пълен списък

| Променлива | Описание | Default | Задължителна |
|------------|----------|---------|-------------|
| `SECRET_KEY` | Django secret key | — | ДА |
| `DEBUG` | Debug mode | `False` | — |
| `ALLOWED_HOSTS` | Allowed hosts | `localhost` | ДА |
| `DJANGO_SETTINGS_MODULE` | Settings module | — | ДА |
| `POSTGRES_DB` | DB name | `clovup` | ДА |
| `POSTGRES_USER` | DB user | `clovup` | ДА |
| `POSTGRES_PASSWORD` | DB password | — | ДА |
| `DATABASE_URL` | Full DB URL | — | ДА |
| `REDIS_URL` | Redis URL | `redis://redis:6379/0` | ДА |
| `CELERY_BROKER_URL` | Celery broker | `redis://redis:6379/1` | ДА |
| `CORS_ALLOWED_ORIGINS` | CORS origins | `http://localhost:4200` | ДА |
| `JWT_ACCESS_LIFETIME` | Access token lifetime (min) | `60` | — |
| `JWT_REFRESH_LIFETIME` | Refresh token lifetime (days) | `7` | — |
| `EMAIL_HOST` | SMTP server | — | — |
| `EMAIL_PORT` | SMTP port | `587` | — |
| `EMAIL_HOST_USER` | SMTP user | — | — |
| `EMAIL_HOST_PASSWORD` | SMTP password | — | — |
| `SENTRY_DSN` | Sentry error tracking DSN | — | — |

---

## Nginx конфигурация

Файл: `nginx/nginx.conf`

### HTTP (без SSL)

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        root /usr/share/nginx/html;
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://backend:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /ws/ {
        proxy_pass http://daphne:8002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

### HTTPS (с SSL)

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate     /etc/nginx/certs/fullchain.pem;
    ssl_certificate_key /etc/nginx/certs/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;

    # ... (same location blocks as above)
}
```

---

## Начална настройка

След успешно стартиране:

### 1. Вход в admin панела

```
https://your-domain.com/admin/
```

С потребителя създаден чрез `createsuperuser`.

### 2. Създаване на тенант

В Django admin:
1. Създайте `Tenant` (име, ЕИК, план)
2. Създайте `Location` (обект)
3. Създайте `TenantUser` (свържете потребител с тенант + роля)
4. Създайте `POSDevice` (устройство)

### 3. Вход в BOS

```
https://your-domain.com/login
```

### 4. Настройка на каталога

1. Създайте категории
2. Добавете продукти
3. Настройте ценови листи (ако е необходимо)

### 5. Настройка на POS

1. Инсталирайте Device Agent на POS терминала
2. Конфигурирайте принтера
3. Влезте в `/pos` от тъч терминала

---

## VPN (WireGuard)

За отдалечен достъп до системата от POS терминали в различни обекти.

### Сървър

```bash
# Инсталиране
sudo apt install -y wireguard

# Генериране на ключове
wg genkey | tee /etc/wireguard/server_privatekey | wg pubkey > /etc/wireguard/server_publickey

# /etc/wireguard/wg0.conf
[Interface]
PrivateKey = <server_privatekey>
Address = 10.0.0.1/24
ListenPort = 51820
PostUp = iptables -A FORWARD -i wg0 -j ACCEPT; iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
PostDown = iptables -D FORWARD -i wg0 -j ACCEPT; iptables -t nat -D POSTROUTING -o eth0 -j MASQUERADE

[Peer]
# POS Terminal 1
PublicKey = <client1_publickey>
AllowedIPs = 10.0.0.2/32
```

```bash
# Стартиране
sudo systemctl enable --now wg-quick@wg0

# Firewall
sudo ufw allow 51820/udp
```

### POS терминал (клиент)

```bash
# /etc/wireguard/wg0.conf
[Interface]
PrivateKey = <client_privatekey>
Address = 10.0.0.2/24

[Peer]
PublicKey = <server_publickey>
Endpoint = server-ip:51820
AllowedIPs = 10.0.0.0/24
PersistentKeepalive = 25
```

---

## Backup стратегия

### Ежедневен backup

Използвайте `scripts/clovup-backup.sh`:

```bash
# Ръчен backup
./scripts/clovup-backup.sh

# Настройка на автоматичен backup
sudo cp scripts/clovup-backup.service /etc/systemd/system/
sudo cp scripts/clovup-backup.timer   /etc/systemd/system/
sudo systemctl enable --now clovup-backup.timer

# Проверка
sudo systemctl list-timers | grep clovup
```

### Какво се backup-ва

1. **PostgreSQL** — пълен SQL dump
2. **`.env` файл** — конфигурация
3. **`nginx/`** — Nginx конфигурация + сертификати
4. **`docker-compose*.yml`** — Docker Compose файлове
5. Компресирано в `.tar.gz`, пази последните 7 backup-а

### Възстановяване

```bash
# Разархивиране
tar -xzf clovup_backup_YYYYMMDD_HHMMSS.tar.gz -C /tmp/restore

# Възстановяване на базата
docker compose -f docker-compose.prod.yml exec -T db \
  psql -U clovup clovup < /tmp/restore/db.sql

# Копиране на конфигурация
cp /tmp/restore/.env /opt/clovup/.env

# Рестартиране
docker compose -f docker-compose.prod.yml restart
```

### Offsite backup

Препоръчително е да се изпращат backup-ите на друга локация:

```bash
# rsync към друг сървър
rsync -avz /opt/clovup/backups/ backup-server:/backups/clovup/

# Или S3-compatible storage
aws s3 sync /opt/clovup/backups/ s3://clovup-backups/ --storage-class GLACIER
```

---

## Автоматично обновяване

```bash
# Ръчно обновяване
./scripts/clovup-update.sh

# Обновяване без backup
./scripts/clovup-update.sh --no-backup
```

### Процес на обновяване

1. Pre-update backup (автоматичен)
2. `git pull --ff-only` (само fast-forward)
3. `docker compose build --no-cache`
4. `django migrate`
5. `django collectstatic`
6. Restart на всички сервизи
7. Health check (3 опита × 10 сек)

### Rollback

При проблем след обновяване:

```bash
# Върнете се към предишен commit
cd /opt/clovup
git log --oneline -5  # намерете предишния commit
git checkout <previous-commit>

# Rebuild
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d

# Ако нужно, възстановете базата от backup
```

---

## Мониторинг

### Docker Compose ps

```bash
docker compose -f docker-compose.prod.yml ps
```

Очаквано: всички сервизи `Up (healthy)`.

### Логове

```bash
# Всички
docker compose -f docker-compose.prod.yml logs -f --tail=100

# Backend
docker compose -f docker-compose.prod.yml logs -f backend

# Celery
docker compose -f docker-compose.prod.yml logs -f celery

# Nginx
docker compose -f docker-compose.prod.yml logs -f frontend
```

### Дисково пространство

```bash
# Docker volumes
docker system df

# Почистване на стари images
docker system prune -a --volumes
```

### PostgreSQL

```bash
# Влезте в psql
docker compose -f docker-compose.prod.yml exec db psql -U clovup clovup

# Размер на базата
SELECT pg_size_pretty(pg_database_size('clovup'));

# Брой поръчки
SELECT COUNT(*) FROM orders_order;
```

### Sentry (опционално)

```env
SENTRY_DSN=https://<key>@sentry.io/<project>
```

В `config/settings/production.py` е налична интеграция със Sentry за автоматично отчитане на грешки.

---

## Troubleshooting

### Контейнер не стартира

```bash
# Вижте логовете
docker compose -f docker-compose.prod.yml logs backend

# Рестартирайте
docker compose -f docker-compose.prod.yml restart backend
```

### Database connection error

```bash
# Проверете дали db контейнерът е ready
docker compose -f docker-compose.prod.yml exec db pg_isready -U clovup

# Проверете DATABASE_URL в .env
grep DATABASE_URL .env
```

### Nginx 502 Bad Gateway

```bash
# Проверете дали backend работи
docker compose -f docker-compose.prod.yml ps backend

# Проверете Nginx логове
docker compose -f docker-compose.prod.yml logs frontend
```

### WebSocket не работи

```bash
# Проверете дали Daphne работи
docker compose -f docker-compose.prod.yml ps daphne

# Проверете Nginx proxy headers
# Уверете се, че /ws/ location има:
#   proxy_http_version 1.1;
#   proxy_set_header Upgrade $http_upgrade;
#   proxy_set_header Connection "upgrade";
```

### Миграции fail-ват

```bash
# Вижте текущото състояние
docker compose -f docker-compose.prod.yml exec backend python manage.py showmigrations

# Fake миграция (внимание!)
docker compose -f docker-compose.prod.yml exec backend python manage.py migrate <app> <migration> --fake
```

### Celery не обработва задачи

```bash
# Проверете Redis
docker compose -f docker-compose.prod.yml exec redis redis-cli ping

# Проверете Celery worker
docker compose -f docker-compose.prod.yml logs celery

# Inspect active tasks
docker compose -f docker-compose.prod.yml exec celery celery -A config inspect active
```

---

## Сигурност

### Checklist за production

- [ ] `DEBUG=False` в `.env`
- [ ] Силен `SECRET_KEY` (мин. 50 символа)
- [ ] Силна парола за PostgreSQL
- [ ] `ALLOWED_HOSTS` ограничен до реалния домейн
- [ ] `CORS_ALLOWED_ORIGINS` ограничен до реалния домейн
- [ ] SSL сертификат инсталиран
- [ ] Firewall конфигуриран (само 22, 80, 443)
- [ ] SSH ключ автентикация (без парола)
- [ ] PostgreSQL не е достъпен отвън
- [ ] Redis не е достъпен отвън
- [ ] Редовни backup-и
- [ ] Sentry или друг error tracking

### Django Security Settings (production.py)

```python
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
X_FRAME_OPTIONS = 'DENY'
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_SSL_REDIRECT = True
```

### JWT Token Lifetime

В production, намалете lifetime на access token:

```env
JWT_ACCESS_LIFETIME=15     # 15 минути
JWT_REFRESH_LIFETIME=1     # 1 ден
```
