FROM python:3.12-slim

# Install Chromium with all dependencies (no --no-install-recommends)
RUN apt-get update && apt-get install -y \
    chromium \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY artifacts/shopee-checker/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY artifacts/shopee-checker/main.py ./main.py
COPY start_railway.sh ./start_railway.sh
RUN chmod +x ./start_railway.sh

ENV PLAYWRIGHT_BROWSERS_PATH=0
ENV NODE_ENV=production

EXPOSE 8080

CMD ["./start_railway.sh"]
