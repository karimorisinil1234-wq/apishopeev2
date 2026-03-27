#!/bin/bash
set -e

PORT="${PORT:-5000}"

# Use system Chromium from nixpkgs (properly built for NixOS)
export PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH="$(which chromium)"
export PLAYWRIGHT_BROWSERS_PATH="0"

exec python3 -m uvicorn main:app --host 0.0.0.0 --port "$PORT" --workers 1
