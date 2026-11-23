#!/usr/bin/env bash
# Nightly backup of every user's saved data (progress, exams, tutor chats, photo state).
# Run from cron on the server; see README "Backups". Keeps the last 30 nightly copies.
set -euo pipefail
APP_DIR="${APP_DIR:-$HOME/espanol-diario}"
DEST="${BACKUP_DIR:-$APP_DIR/backups}"
KEEP="${KEEP:-30}"
mkdir -p "$DEST"
stamp=$(date +%Y%m%d-%H%M%S)
tmp="$DEST/.data-$stamp.tgz.part"
tar -czf "$tmp" -C "$APP_DIR" data
tar -tzf "$tmp" >/dev/null # refuse a broken archive
mv "$tmp" "$DEST/data-$stamp.tgz"
# Optional second copy on another disk or machine (set BACKUP_MIRROR to a path or rsync target).
if [ -n "${BACKUP_MIRROR:-}" ]; then rsync -a "$DEST/data-$stamp.tgz" "$BACKUP_MIRROR/"; fi
ls -1t "$DEST"/data-*.tgz | tail -n +$((KEEP + 1)) | xargs -r rm --
echo "$(date -Is) backup ok: data-$stamp.tgz ($(du -h "$DEST/data-$stamp.tgz" | cut -f1))"
