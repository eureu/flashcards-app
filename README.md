# Language Cards

Telegram Mini App для общего словаря друзей и персональных повторений карточек.

Проект реализуется по утверждённой [спецификации](docs/superpowers/specs/2026-10-14-language-cards-design.md) и [SDD-плану](docs/superpowers/plans/2026-10-14-language-cards.md).

## Разработка

Требуются Docker Desktop и Docker Compose. Рабочие секреты не хранятся в репозитории.

Backend-тесты:

```bash
docker compose -f compose.test.yaml run --build --rm api-test pytest -q
```

Frontend-тесты:

```bash
docker compose -f compose.test.yaml run --build --rm web-test npm test -- --run
```

Полная проверка, E2E и эксплуатация описаны в [docs/verification.md](docs/verification.md) и [docs/deployment.md](docs/deployment.md).

## Production-запуск

Production-адрес приложения зафиксирован как `https://flashcards.eureu.space`. На сервере должны быть установлены Docker Engine и Docker Compose v2, DNS домена должен указывать на сервер, а входящие TCP-порты `80` и `443` должны быть открыты.

Для запуска нужны реальные `BOT_TOKEN`, `BOT_USERNAME`, `APP_SECRET` и `DATABASE_PASSWORD` в локальном `.env`. Для пароля базы используйте URL-безопасную случайную строку, например результат `openssl rand -hex 24`. `LETSENCRYPT_EMAIL` можно добавить для уведомлений Let's Encrypt; без него Certbot зарегистрирует аккаунт без email.

После копирования репозитория и `.env` на сервер достаточно выполнить:

```bash
git pull
./scripts/deploy.sh
```

Nginx автоматически обслуживает HTTPS, Certbot обновляет сертификат, а deploy-скрипт настраивает кнопку меню бота. FastAPI и PostgreSQL наружу не публикуются. Общие карточки могут добавлять участники группы с Telegram ID `1568151709` и `735056285`; владелец группы может редактировать и удалять любые её общие карточки.

Полная инструкция, диагностика и обязательная настройка Main Mini App в BotFather приведены в [docs/deployment.md](docs/deployment.md).
