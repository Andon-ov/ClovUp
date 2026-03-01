#!/usr/bin/env bash
# ============================================================
# ClovUp — Backup Script
# Creates timestamped backups of the PostgreSQL database
# and critical configuration files.
#
# Usage:
#   ./scripts/clovup-backup.sh [backup_dir]
#
# Default backup directory: /opt/clovup/backups
# ============================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="${1:-/opt/clovup/backups}"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP_NAME="clovup_backup_${TIMESTAMP}"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_NAME}"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log()  { echo -e "${GREEN}[BACKUP]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
err()  { echo -e "${RED}[ERROR]${NC} $1" >&2; }

# ── Ensure backup directory exists ──
mkdir -p "${BACKUP_PATH}"
log "Backup directory: ${BACKUP_PATH}"

# ── 1. PostgreSQL dump ──
log "Dumping PostgreSQL database..."
if docker compose -f "${PROJECT_DIR}/docker-compose.yml" exec -T db \
    pg_dump -U "${POSTGRES_USER:-clovup}" "${POSTGRES_DB:-clovup}" \
    > "${BACKUP_PATH}/db.sql" 2>/dev/null; then
    log "Database dump: OK ($(du -h "${BACKUP_PATH}/db.sql" | cut -f1))"
else
    warn "Database dump failed. Trying docker-compose.prod.yml..."
    if docker compose -f "${PROJECT_DIR}/docker-compose.prod.yml" exec -T db \
        pg_dump -U "${POSTGRES_USER:-clovup}" "${POSTGRES_DB:-clovup}" \
        > "${BACKUP_PATH}/db.sql" 2>/dev/null; then
        log "Database dump (prod): OK"
    else
        err "Could not dump database. Manual backup may be needed."
    fi
fi

# ── 2. Copy environment file ──
if [[ -f "${PROJECT_DIR}/.env" ]]; then
    cp "${PROJECT_DIR}/.env" "${BACKUP_PATH}/.env"
    log "Environment file: OK"
else
    warn "No .env file found."
fi

# ── 3. Copy nginx config ──
if [[ -d "${PROJECT_DIR}/nginx" ]]; then
    cp -r "${PROJECT_DIR}/nginx" "${BACKUP_PATH}/nginx"
    log "Nginx config: OK"
fi

# ── 4. Copy docker compose files ──
cp "${PROJECT_DIR}/docker-compose.yml" "${BACKUP_PATH}/" 2>/dev/null || true
cp "${PROJECT_DIR}/docker-compose.prod.yml" "${BACKUP_PATH}/" 2>/dev/null || true
log "Docker compose files: OK"

# ── 5. Compress ──
log "Compressing backup..."
cd "${BACKUP_DIR}"
tar -czf "${BACKUP_NAME}.tar.gz" "${BACKUP_NAME}/"
rm -rf "${BACKUP_PATH}"
log "Backup archive: ${BACKUP_DIR}/${BACKUP_NAME}.tar.gz"

# ── 6. Cleanup old backups (keep last 7) ──
BACKUP_COUNT=$(ls -1 "${BACKUP_DIR}"/clovup_backup_*.tar.gz 2>/dev/null | wc -l)
if [[ ${BACKUP_COUNT} -gt 7 ]]; then
    ls -1t "${BACKUP_DIR}"/clovup_backup_*.tar.gz | tail -n +8 | xargs rm -f
    log "Old backups cleaned (kept last 7)."
fi

log "Backup complete!"
echo "  Archive: ${BACKUP_DIR}/${BACKUP_NAME}.tar.gz"
echo "  Size:    $(du -h "${BACKUP_DIR}/${BACKUP_NAME}.tar.gz" | cut -f1)"
