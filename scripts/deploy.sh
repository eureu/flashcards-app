#!/usr/bin/env bash
set -Eeuo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
DOMAIN="flashcards.eureu.space"
PUBLIC_URL="https://${DOMAIN}"
RUNTIME_CONFIG="${PROJECT_ROOT}/deploy/nginx/runtime/default.conf"
BOOTSTRAP_CONFIG="${PROJECT_ROOT}/deploy/nginx/bootstrap.conf"
HTTPS_CONFIG="${PROJECT_ROOT}/deploy/nginx/https.conf"

cd "${PROJECT_ROOT}"

for command in docker curl; do
  if ! command -v "${command}" >/dev/null 2>&1; then
    echo "Не найдена обязательная команда: ${command}" >&2
    exit 1
  fi
done

if ! docker compose version >/dev/null 2>&1; then
  echo "Docker Compose v2 недоступен" >&2
  exit 1
fi

if [[ ! -f .env ]]; then
  echo "Отсутствует ${PROJECT_ROOT}/.env" >&2
  exit 1
fi

for variable in BOT_TOKEN BOT_USERNAME APP_SECRET DATABASE_PASSWORD; do
  if ! grep -Eq "^${variable}=.+" .env; then
    echo "В .env отсутствует непустая переменная ${variable}" >&2
    exit 1
  fi
done

mkdir -p "$(dirname "${RUNTIME_CONFIG}")"

if docker compose run --rm --no-deps --entrypoint /bin/sh certbot -c \
  "test -f /etc/letsencrypt/live/${DOMAIN}/fullchain.pem && test -f /etc/letsencrypt/live/${DOMAIN}/privkey.pem"; then
  cp "${HTTPS_CONFIG}" "${RUNTIME_CONFIG}"
else
  cp "${BOOTSTRAP_CONFIG}" "${RUNTIME_CONFIG}"
fi

docker compose config --quiet
docker compose build app
docker compose up -d db
docker compose run --rm app alembic upgrade head
docker compose up -d app nginx
docker compose exec -T nginx nginx -t
docker compose exec -T nginx nginx -s reload

curl --fail --silent --show-error \
  --retry 12 --retry-delay 5 --retry-all-errors \
  --header "Host: ${DOMAIN}" \
  http://127.0.0.1/healthz >/dev/null

docker compose run --rm --no-deps --entrypoint /bin/sh certbot -c \
  'if [ -n "${LETSENCRYPT_EMAIL:-}" ]; then
     exec certbot certonly --webroot -w /var/www/certbot --non-interactive --agree-tos --no-eff-email --keep-until-expiring --email "${LETSENCRYPT_EMAIL}" -d flashcards.eureu.space;
   else
     exec certbot certonly --webroot -w /var/www/certbot --non-interactive --agree-tos --keep-until-expiring --register-unsafely-without-email -d flashcards.eureu.space;
   fi'

cp "${HTTPS_CONFIG}" "${RUNTIME_CONFIG}"
docker compose exec -T nginx nginx -t
docker compose exec -T nginx nginx -s reload
docker compose up -d certbot

curl --fail --silent --show-error \
  --retry 12 --retry-delay 5 --retry-all-errors \
  "${PUBLIC_URL}/api/health" >/dev/null

docker compose exec -T app python -m app.deployment.telegram_menu
docker compose ps

echo "Language Cards доступен: ${PUBLIC_URL}"
