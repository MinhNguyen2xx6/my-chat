#!/usr/bin/env bash
# Backup MongoDB Atlas về máy này, giữ 7 ngày. Cần: mongodump (MongoDB Database Tools)
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; source .env; set +a

DEST="$HOME/backups/mongodb/$(date +%F)"
mkdir -p "$DEST"
mongodump --uri="$MONGODB_URI" --out="$DEST"
find "$HOME/backups/mongodb" -mindepth 1 -maxdepth 1 -type d -mtime +7 -exec rm -rf {} +
echo "Backup xong: $DEST"
