# Развёртывание Language Cards

## Обязательные настройки

Создайте локальный файл `.env`, который не коммитится, и задайте в нём четыре переменные:

- `BOT_TOKEN` — токен существующего Telegram-бота от BotFather;
- `BOT_USERNAME` — username этого бота без символа `@`; он используется для ссылок-приглашений Mini App;
- `APP_SECRET` — случайный секрет длиной не менее 32 символов для подписи сессий и подтверждений импорта.
- `DATABASE_PASSWORD` — отдельная URL-безопасная случайная строка для PostgreSQL; подходящее значение создаёт команда `openssl rand -hex 24`.

`DATABASE_URL` внутри Compose собирается из `DATABASE_PASSWORD` и указывает на закрытый сервис PostgreSQL. При запуске приложения вне Compose нужно задать полный `DATABASE_URL` отдельно. Внешний HTTPS-адрес и имя бота задаются в инфраструктуре и BotFather, а не в исходном коде. Право добавлять общие карточки имеет только Telegram user ID `1568151709`.

## Сборка и запуск

Образ собирается в два этапа: Node 24 компилирует React-интерфейс, Python 3.13 запускает FastAPI и отдаёт UI с того же origin.

```bash
docker compose build
docker compose up -d db
docker compose run --rm app alembic upgrade head
docker compose up -d app
docker compose ps
```

Миграции намеренно выполняются отдельной командой. База имеет постоянный volume `language-cards-db` и не публикует порт на хост. Перед обновлением образа сначала сделайте резервную копию.

## HTTPS и Telegram

1. Опубликуйте порт приложения через reverse proxy с действительным TLS-сертификатом.
2. В BotFather выберите бота, откройте настройки Mini App и укажите полный публичный HTTPS-адрес как Main Mini App URL.
3. Откройте Mini App из Telegram и проверьте вход, светлую/тёмную тему, safe-area и кнопку Back.

Репозиторий не создаёт бота, не меняет настройки BotFather и не публикует приложение от имени владельца.

## Резервное копирование и восстановление

Создание SQL-дампа без остановки приложения:

```bash
docker compose exec -T db pg_dump -U language_cards -d language_cards -Fc > language-cards.backup
```

Перед восстановлением остановите приложение, пересоздайте пустую базу внутри существующего volume и восстановите дамп:

```bash
docker compose stop app
docker compose exec -T db dropdb -U language_cards language_cards
docker compose exec -T db createdb -U language_cards language_cards
docker compose exec -T db pg_restore -U language_cards -d language_cards --clean --if-exists < language-cards.backup
docker compose up -d app
```

Файл `language-cards.backup` храните за пределами репозитория и проверяйте восстановление на отдельном тестовом окружении.
