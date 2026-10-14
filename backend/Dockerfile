FROM python:3.13-slim AS base
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
COPY requirements.lock requirements-dev.lock ./
RUN pip install --no-cache-dir -r requirements.lock -r requirements-dev.lock
COPY . .

FROM base AS test
CMD ["pytest", "-q"]

