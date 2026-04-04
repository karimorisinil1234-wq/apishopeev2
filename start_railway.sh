#!/bin/bash
set -e

# Auto-detect chromium binary path
for candidate in /usr/bin/chromium /usr/bin/chromium-browser /usr/lib/chromium/chromium; do
  if [ -x "$candidate" ]; then
    export PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH="$candidate"
    break
  fi
done

if [ -z "$PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH" ]; then
  # Last resort: search in PATH
  FOUND=$(which chromium 2>/dev/null || which chromium-browser 2>/dev/null || echo "")
  if [ -n "$FOUND" ]; then
    export PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH="$FOUND"
  else
    echo "ERROR: Chromium tidak ditemukan!" && exit 1
  fi
fi

export PLAYWRIGHT_BROWSERS_PATH=0
echo "Using Chromium: $PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH"

PORT="${PORT:-8080}"
exec python3 -m uvicorn main:app --host 0.0.0.0 --port "$PORT" --workers 1
