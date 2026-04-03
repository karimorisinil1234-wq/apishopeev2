#!/bin/bash
set -e

PORT="${PORT:-5000}"

# Detect system Chromium path (works on both NixOS/Railway and Replit)
CHROMIUM_PATH="${PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH:-}"
if [ -z "$CHROMIUM_PATH" ]; then
  CHROMIUM_PATH="$(which chromium 2>/dev/null || which chromium-browser 2>/dev/null || echo '')"
fi

if [ -z "$CHROMIUM_PATH" ]; then
  echo "ERROR: chromium tidak ditemukan di PATH"
  exit 1
fi

export PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH="$CHROMIUM_PATH"
export PLAYWRIGHT_BROWSERS_PATH="0"

echo "Using Chromium: $CHROMIUM_PATH"

cd "$(dirname "$0")"

exec python3 -m uvicorn main:app --host 0.0.0.0 --port "$PORT" --workers 1
