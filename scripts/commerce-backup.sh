#!/usr/bin/env bash
set -euo pipefail
DB="${AUTOMATON_DB_PATH:-/home/clawdbot/.openclaw/workspace/projects/oakhampton-automaton/data/commerce.db}"
DEST="${AUTOMATON_BACKUP_DIR:-/home/clawdbot/.openclaw/backups/oakhampton-automaton}"
mkdir -p "$DEST"
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
sqlite3 "$DB" ".backup '$DEST/commerce-$stamp.db'"
sqlite3 "$DEST/commerce-$stamp.db" "PRAGMA integrity_check;" | grep -qx ok
chmod 600 "$DEST/commerce-$stamp.db"
find "$DEST" -type f -name 'commerce-*.db' -mtime +30 -delete
