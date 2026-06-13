#!/bin/sh
set -e
echo "[client] generating runtime configuration..."
node /app/generate-config.mjs
echo "[client] serving Nitro-V3 on :80"
exec http-server /app/dist -p 80 --cors -s -c-1
