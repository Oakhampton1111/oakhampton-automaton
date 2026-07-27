#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
exec 9>/tmp/oakhampton-insights.lock
flock -n 9 || exit 0
python3 "$ROOT/scripts/publish_next.py"
"$ROOT/scripts/deploy.sh"
python3 "$ROOT/scripts/indexnow_notify.py"
python3 "$ROOT/scripts/weekly_report.py"



