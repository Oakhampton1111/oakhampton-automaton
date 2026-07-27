#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LIVE=/var/www/oakhampton-automation-services
STAGE="$ROOT/state/deploy-stage"
BACKUP="$ROOT/state/backups/oakhampton-automation-services.$(date -u +%Y%m%dT%H%M%SZ)"
python3 "$ROOT/scripts/build_visibility.py"
python3 "$ROOT/scripts/validate_site.py"
rm -rf "$STAGE"
cp -a "$ROOT/public" "$STAGE"
test -s "$STAGE/index.html"
mkdir -p "$ROOT/state/backups"
cp -a "$LIVE" "$BACKUP"
rsync -a --delete "$STAGE/" "$LIVE/"
rm -rf "$STAGE"
curl -fsS https://www.oakhampton.ai/automation-services/ >/dev/null
curl -fsS https://www.oakhampton.ai/automation-services/insights/ >/dev/null
echo "deployed; backup=$BACKUP"
