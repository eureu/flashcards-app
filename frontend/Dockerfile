FROM node:24-alpine AS test
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
CMD ["npm", "test", "--", "--run"]

FROM node:24-bookworm-slim AS e2e
WORKDIR /app
RUN apt-get update \
    && apt-get install -y --no-install-recommends chromium \
    && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ENV PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium
CMD ["npm", "run", "test:e2e"]

