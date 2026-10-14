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

## Запуск

Для запуска нужны реальные `BOT_TOKEN` и `APP_SECRET` в локальном `.env`. Затем:

```bash
docker compose build
docker compose run --rm app alembic upgrade head
docker compose up -d
```

Приложение и API доступны на одном origin через порт `8000`; PostgreSQL наружу не публикуется. Единственный Telegram ID, которому разрешено добавлять общие карточки, зафиксирован как `1568151709`.
