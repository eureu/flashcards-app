# Развёртывание Language Cards на flashcards.eureu.space

## Что будет запущено

- Nginx принимает внешний трафик на TCP-портах `80` и `443`.
- Certbot получает и каждые 12 часов проверяет TLS-сертификат Let's Encrypt.
- Nginx перечитывает сертификат каждые 6 часов.
- FastAPI доступен только Nginx внутри Docker-сети на порту `8000`.
- PostgreSQL доступен только приложению внутри Docker-сети на порту `5432`.
- Production URL: `https://flashcards.eureu.space`.

## Обязательные настройки

Создайте на сервере файл `.env`, который не коммитится, и задайте в нём четыре обязательные переменные:

- `BOT_TOKEN` — токен существующего Telegram-бота от BotFather;
- `BOT_USERNAME` — username этого бота без символа `@`; он используется для ссылок-приглашений Mini App;
- `APP_SECRET` — случайный секрет длиной не менее 32 символов для подписи сессий и подтверждений импорта.
- `DATABASE_PASSWORD` — отдельная URL-безопасная случайная строка для PostgreSQL; подходящее значение создаёт команда `openssl rand -hex 24`.

Необязательная переменная `LETSENCRYPT_EMAIL` задаёт адрес для уведомлений Let's Encrypt. Если её нет, сертификат всё равно выпускается, но уведомления о проблемах продления не придут.

`DATABASE_URL` внутри Compose собирается из `DATABASE_PASSWORD` и указывает на закрытый сервис PostgreSQL. При запуске приложения вне Compose нужно задать полный `DATABASE_URL` отдельно. Внешний HTTPS-адрес и имя бота задаются в инфраструктуре и BotFather, а не в исходном коде. Право добавлять общие карточки имеют участники группы с Telegram user ID `1568151709` и `735056285`. Владелец группы может редактировать и удалять любые общие карточки своей группы, но не получает право создавать их автоматически.

## Требования к серверу

Перед первым запуском убедитесь, что:

1. На сервере установлены Docker Engine и Docker Compose v2.
2. DNS-запись `A` домена `flashcards.eureu.space` указывает на публичный IPv4 сервера.
3. Если существует запись `AAAA`, она указывает на рабочий публичный IPv6 этого же сервера; иначе удалите её до выпуска сертификата.
4. В firewall сервера и панели хостинга разрешён входящий TCP-трафик на порты `80` и `443`.
5. Порты `80` и `443` не заняты другим Nginx, Apache, Caddy или панелью управления.

Для Ubuntu с включённым UFW порты открываются командами:

```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

## Первый запуск и обновление

После копирования репозитория и `.env` на сервер выполните:

```bash
git pull
./scripts/deploy.sh
```

Скрипт выполняет следующие операции в безопасном порядке:

1. Проверяет Docker Compose и обязательные переменные `.env`.
2. Собирает production-образ приложения.
3. Запускает PostgreSQL и применяет Alembic-миграции.
4. Запускает временную HTTP-конфигурацию Nginx для ACME challenge.
5. Получает или повторно использует сертификат Let's Encrypt.
6. Проверяет production-конфигурацию Nginx и включает HTTPS.
7. Проверяет `https://flashcards.eureu.space/api/health`.
8. Сверяет `BOT_USERNAME` с токеном и устанавливает кнопку меню «Открыть приложение» через Telegram Bot API.

Команда идемпотентна и используется также для последующих обновлений. Миграции выполняются до замены работающего приложения. Данные PostgreSQL, сертификаты и ACME-данные находятся в отдельных постоянных Docker volumes.

## Обязательная настройка Telegram

Deploy-скрипт автоматически создаёт кнопку меню, но Telegram не позволяет включить Main Mini App профиля обычным Bot API. Это нужно сделать один раз вручную:

1. Откройте `@BotFather` в Telegram.
2. Выполните `/mybots` и выберите бота, username которого задан в `BOT_USERNAME` файла `.env`.
3. Откройте `Bot Settings` → `Configure Mini App` → `Enable Mini App`.
4. Укажите URL `https://flashcards.eureu.space`.
5. Откройте профиль этого же бота: должна появиться кнопка запуска приложения.

После этого проверьте кнопку профиля, кнопку меню «Открыть приложение» и прямую `t.me`-ссылку с `startapp` для username из `BOT_USERNAME`.

Deploy-скрипт не читает сообщения и не включает webhook или polling: они этому Mini App не нужны. Без отдельного обработчика бот не отвечает текстом на `/start`; запуск выполняется кнопками Telegram.

## Диагностика

Состояние контейнеров:

```bash
docker compose ps
```

Логи Nginx и приложения:

```bash
docker compose logs --tail=200 nginx app certbot
```

Проверка HTTPS:

```bash
curl --fail --show-error https://flashcards.eureu.space/api/health
```

Проверка механизма продления сертифика без изменения данных:

```bash
docker compose exec certbot certbot renew --webroot -w /var/www/certbot --dry-run
```

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
