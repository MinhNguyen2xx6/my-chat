#!/usr/bin/env bash
# Chạy trên server: cập nhật code và khởi động lại backend
set -euo pipefail
cd "$(dirname "$0")/.."
git pull
npm ci --omit=dev
pm2 startOrReload ecosystem.config.js
pm2 save
