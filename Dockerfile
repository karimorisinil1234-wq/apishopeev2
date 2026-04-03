# =========================================================
# Stage 1: Build JS (React frontend + Express API)
# =========================================================
FROM node:20-slim AS js-builder

RUN npm install -g pnpm@9

WORKDIR /workspace

# Copy workspace manifests first (better layer caching)
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY artifacts/api-server/package.json ./artifacts/api-server/
COPY artifacts/shopee-checker-ui/package.json ./artifacts/shopee-checker-ui/
COPY artifacts/mockup-sandbox/package.json ./artifacts/mockup-sandbox/

# Install all workspace deps
RUN pnpm install --frozen-lockfile --ignore-scripts 2>/dev/null || pnpm install --ignore-scripts

# Copy source files
COPY artifacts/api-server/ ./artifacts/api-server/
COPY artifacts/shopee-checker-ui/ ./artifacts/shopee-checker-ui/

# Build Express API + React frontend
RUN pnpm --filter @workspace/api-server run build
RUN pnpm --filter @workspace/shopee-checker-ui run build


# =========================================================
# Stage 2: Final runtime image
# =========================================================
FROM python:3.12-slim

# Install Node.js 20 + Chromium (let apt handle all chromium deps)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl gnupg chromium \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies
COPY artifacts/shopee-checker/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy Python backend
COPY artifacts/shopee-checker/main.py ./main.py

# Copy built Express API (self-contained bundle)
COPY --from=js-builder /workspace/artifacts/api-server/dist ./api-server/dist
COPY --from=js-builder /workspace/artifacts/api-server/node_modules ./api-server/node_modules
COPY --from=js-builder /workspace/artifacts/api-server/package.json ./api-server/package.json

# Copy built React frontend → Express serves this as static files
COPY --from=js-builder /workspace/artifacts/shopee-checker-ui/dist ./public

# Startup script
COPY start_railway.sh ./start_railway.sh
RUN chmod +x ./start_railway.sh

ENV PLAYWRIGHT_BROWSERS_PATH=0
ENV PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium
ENV SHOPEE_SERVICE_PORT=5000
ENV NODE_ENV=production

EXPOSE 8080

CMD ["./start_railway.sh"]
