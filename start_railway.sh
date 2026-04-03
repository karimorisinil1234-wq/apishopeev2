#!/bin/bash
set -e

export PLAYWRIGHT_BROWSERS_PATH=0
export PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium
export SHOPEE_SERVICE_PORT=5000

echo "Starting Python Shopee Checker on port 5000..."
PORT=5000 python3 main.py &
PYTHON_PID=$!

# Wait for Python service to be ready (max 30s)
echo "Waiting for Python service..."
for i in $(seq 1 30); do
  if curl -sf http://localhost:5000/health > /dev/null 2>&1; then
    echo "Python service ready after ${i}s!"
    break
  fi
  sleep 1
done

RAILWAY_PORT="${PORT:-8080}"
echo "Starting Express API + frontend on port $RAILWAY_PORT..."
cd /app/api-server && PORT="$RAILWAY_PORT" node dist/index.mjs
