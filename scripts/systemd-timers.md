# ============================================================
# ClovUp — Systemd Timer for Daily Backups
#
# Install:
#   sudo cp scripts/clovup-backup.service /etc/systemd/system/
#   sudo cp scripts/clovup-backup.timer   /etc/systemd/system/
#   sudo systemctl enable --now clovup-backup.timer
# ============================================================

# ── clovup-backup.service ──
[Unit]
Description=ClovUp Daily Backup
After=docker.service

[Service]
Type=oneshot
User=root
WorkingDirectory=/opt/clovup
ExecStart=/opt/clovup/scripts/clovup-backup.sh /opt/clovup/backups
StandardOutput=journal
StandardError=journal

---

# ── clovup-backup.timer ──
[Unit]
Description=ClovUp Daily Backup Timer

[Timer]
OnCalendar=*-*-* 03:00:00
Persistent=true

[Install]
WantedBy=timers.target
