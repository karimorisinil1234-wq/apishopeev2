#!/bin/bash
set -e

# Start Shopee Checker Python service in the background
export PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH="$(which chromium)"
export PLAYWRIGHT_BROWSERS_PATH="0"

SHOPEE_DIR="$(dirname "$0")/../shopee-checker"

echo "[startup] Installing Python deps..."
pip install -q -r "$SHOPEE_DIR/requirements.txt"

echo "[startup] Starting Shopee Checker service..."
(cd "$SHOPEE_DIR" && python3 -m uvicorn main:app --host 127.0.0.1 --port 5000 --workers 1 &)

echo "[startup] Waiting for Shopee Checker to be ready..."
for i in $(seq 1 30); do
  if curl -sf http://127.0.0.1:5000/health > /dev/null 2>&1; then
    echo "[startup] Shopee Checker ready"
    break
  fi
  sleep 1
done

echo "[startup] Starting API server..."
exec node --enable-source-maps "$(dirname "$0")/dist/index.mjs"
