#!/usr/bin/env bash
# ============================================================
# ClovUp — Auto-Update Script
# Pulls latest code, rebuilds containers, runs migrations.
#
# Usage:
#   ./scripts/clovup-update.sh [--no-backup]
#
# Steps:
#   1. Create backup (unless --no-backup)
#   2. Pull latest code from git
#   3. Rebuild Docker images
#   4. Run Django migrations
#   5. Collect static files
#   6. Restart services
# ============================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
COMPOSE_FILE="${PROJECT_DIR}/docker-compose.prod.yml"
NO_BACKUP=false

for arg in "$@"; do
    case $arg in
        --no-backup) NO_BACKUP=true ;;
    esac
done

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log()  { echo -e "${GREEN}[UPDATE]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
err()  { echo -e "${RED}[ERROR]${NC} $1" >&2; exit 1; }

cd "${PROJECT_DIR}"

# ── 1. Pre-flight checks ──
command -v docker >/dev/null 2>&1 || err "Docker not installed."
command -v git >/dev/null 2>&1 || err "Git not installed."

log "Starting ClovUp update..."
echo "  Project: ${PROJECT_DIR}"
echo "  Compose: ${COMPOSE_FILE}"

# ── 2. Backup (unless skipped) ──
if [[ "${NO_BACKUP}" == false ]]; then
    log "Creating pre-update backup..."
    bash "${SCRIPT_DIR}/clovup-backup.sh" || warn "Backup failed, continuing anyway."
else
    warn "Backup skipped (--no-backup flag)."
fi

# ── 3. Pull latest code ──
log "Pulling latest code..."
CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
BEFORE_HASH="$(git rev-parse HEAD)"
git pull origin "${CURRENT_BRANCH}" --ff-only || err "Git pull failed. Resolve conflicts manually."
AFTER_HASH="$(git rev-parse HEAD)"

if [[ "${BEFORE_HASH}" == "${AFTER_HASH}" ]]; then
    log "Already up to date (${BEFORE_HASH:0:8})."
else
    log "Updated: ${BEFORE_HASH:0:8} → ${AFTER_HASH:0:8}"
    git log --oneline "${BEFORE_HASH}..${AFTER_HASH}" | head -20
fi

# ── 4. Rebuild Docker images ──
log "Rebuilding Docker images..."
docker compose -f "${COMPOSE_FILE}" build --no-cache

# ── 5. Run migrations ──
log "Running database migrations..."
docker compose -f "${COMPOSE_FILE}" run --rm backend python manage.py migrate --noinput

# ── 6. Collect static files ──
log "Collecting static files..."
docker compose -f "${COMPOSE_FILE}" run --rm backend python manage.py collectstatic --noinput 2>/dev/null || true

# ── 7. Restart services ──
log "Restarting services..."
docker compose -f "${COMPOSE_FILE}" down
docker compose -f "${COMPOSE_FILE}" up -d

# ── 8. Health check ──
log "Waiting for services to start..."
sleep 10

BACKEND_OK=false
for i in $(seq 1 12); do
    if docker compose -f "${COMPOSE_FILE}" exec -T backend python -c "print('ok')" 2>/dev/null; then
        BACKEND_OK=true
        break
    fi
    sleep 5
done

if [[ "${BACKEND_OK}" == true ]]; then
    log "Backend is healthy."
else
    warn "Backend health check timed out. Check logs: docker compose -f ${COMPOSE_FILE} logs backend"
fi

# ── Done ──
log "Update complete!"
echo ""
echo "  Version: $(git rev-parse --short HEAD)"
echo "  Branch:  ${CURRENT_BRANCH}"
echo "  Status:  docker compose -f ${COMPOSE_FILE} ps"
echo "  Logs:    docker compose -f ${COMPOSE_FILE} logs -f"
