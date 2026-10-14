# Telegram Language Cards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Создать Telegram Mini App, где друзья повторяют общий набор слов и личные карточки, а общие карточки добавляет только Telegram-пользователь `1568151709`.

**Architecture:** Один Python/FastAPI backend хранит данные в PostgreSQL и рассчитывает повторения через FSRS. React/TypeScript показывает мобильный интерфейс, собирается в статические файлы и обслуживается с одного origin с API. Docker Compose запускает приложение и базу; тестовое окружение изолировано от пользовательских данных.

**Tech Stack:** Python 3.13, FastAPI, Pydantic, SQLAlchemy, Alembic, psycopg, PyJWT, fsrs; React, TypeScript, Vite; PostgreSQL 17, Docker Compose; pytest, Vitest, Testing Library, Playwright.

**Spec:** [Утверждённая спецификация](/Users/veniamin/GitHub/studiyng-app/docs/superpowers/specs/2026-10-14-language-cards-design.md).

Статус: план подготовлен для ревью; реализация ещё не начата. Способ выполнения пока не выбран. Все пути создаваемых файлов ниже отсчитываются от `/Users/veniamin/GitHub/studiyng-app`.

## Global Constraints

- Выбран первый вариант: Python/FastAPI + React/TypeScript, PostgreSQL и Docker.
- Новые общие карточки добавляет только аккаунт с жёстко заданным Telegram user ID `1568151709`; он должен состоять в целевой группе.
- Автор редактирует свои общие карточки, пока состоит в группе; создатель группы может редактировать и удалять любые общие карточки. Создатель не получает право добавления автоматически.
- Личные карточки каждый пользователь добавляет и изменяет для себя.
- У учебной группы общий набор карточек. Прогресс и расписание повторений индивидуальны.
- Английский → русский и русский → английский доступны в первой версии. Прогресс и сроки повторений направлений независимы.
- Оценки: «Не вспомнил», «С трудом», «Вспомнил», «Легко».
- На самой учебной карточке только слово/фраза и перевод. Ответ скрыт до раскрытия. Автор, принадлежность, направление, статистика и сроки на карточке не отображаются; кнопки раскрытия и четырёх оценок находятся вне её содержимого.
- Напоминаний, таймера, учёта длительности занятий и дневной цели в минутах нет.
- Письменного ввода перевода и автоматической проверки ответа в тренировке нет.
- Предел одного импорта: 500 непустых строк; длина одной стороны — до 2 000 символов.
- FSRS: целевое удержание `0.9`, обучение 1 и 10 минут, переучивание 10 минут; упреждение только коротких повторений — 20 минут.
- Моменты повторения хранятся в UTC; продолжительность занятий не измеряется.
- Визуальные токены и тексты берутся из раздела 7 спецификации; текстовый контраст не ниже 4.5:1, кнопки оценки — сетка 2 × 2, высота не менее 56 px.
- Код приложения создаётся после ревью плана и выбора способа выполнения. Внешняя публикация и создание Telegram-бота не являются задачами этого плана.

## Review Focus

1. Другой создатель группы пытается опубликовать общую карточку, меняет username или присылает чужой Telegram ID: отказ на сервере; издатель без членства тоже получает отказ. Проверки — задачи 2–4.
2. Ответ или импорт сохранён, но клиент потерял HTTP-ответ: повтор с тем же ключом возвращает прежний результат до проверки изменившегося снимка данных и не создаёт вторую запись. Проверки — задачи 4–5.
3. Дефисы внутри слов, NBSP, лишние пробелы, повтор `Provision`, строка про `it depends`, изменённые после предпросмотра строки: исходный текст не теряется, ошибки видны, устаревшее подтверждение не применяется. Проверки — задача 4.
4. Два устройства оценивают одно задание; карточка изменена, удалена либо пользователь вышел из группы между показом и оценкой: не перезаписывать новое состояние и не сохранять оценку утратившего доступ пользователя. Проверки — задача 5.
5. Длинная фраза, узкий экран, тёмная тема и временная потеря сети: текст доступен полностью, элементы управления вне карточки, повтор запроса не переворачивает следующую карточку. Проверки — задачи 6–7.

## Исходное состояние и окружение

В каталоге есть только спецификация и этот план. Git ещё не инициализирован. На хосте обнаружены Python 3.10.6, Node 21.7.3 и Docker CLI 27.3.1; системные Python и Node не обновлять. Рабочие версии запускаются в контейнерах: Python 3.13, Node 24 для сборки/тестов, PostgreSQL 17. Выбранные ветки поддерживаются: [Python](https://devguide.python.org/versions/), [Node.js](https://nodejs.org/en/about/previous-releases), [PostgreSQL](https://www.postgresql.org/support/versioning/).

Первое выполнение фиксирует совместимые точные версии Python-пакетов в `requirements.lock` и `requirements-dev.lock`, JavaScript-пакетов — в `package-lock.json`; последующие сборки используют lock-файлы. Настройка локального Docker daemon и получение образов проверяются при начале реализации, сейчас они не выполнялись.

## Карта файлов и границы модулей

| Область | Файлы | Ответственность |
| --- | --- | --- |
| Запуск | `Dockerfile`, `compose.yaml`, `compose.test.yaml`, `.dockerignore`, `.gitignore` | Сборка приложения, отдельная тестовая БД, исключение секретов и артефактов |
| Python-проект | `backend/pyproject.toml`, `backend/requirements.lock`, `backend/requirements-dev.lock`, `backend/alembic.ini` | Зависимости и настройки инструментов |
| Основа API | `backend/app/main.py`, `config.py`, `db.py`, `errors.py`, `clock.py`, `signing.py` | Фабрика приложения, настройки, подключения, ошибки, время и подписанные токены |
| Вход | `backend/app/auth/models.py`, `schemas.py`, `telegram.py`, `service.py`, `routes.py`, `dependencies.py` | Telegram-вход и сессии |
| Группы | `backend/app/groups/models.py`, `schemas.py`, `policy.py`, `service.py`, `routes.py` | Группы, членство, приглашения и константа издателя |
| Карточки | `backend/app/cards/models.py`, `schemas.py`, `policy.py`, `service.py`, `routes.py` | Две стороны, видимость, авторство, изменения и удаление |
| Импорт | `backend/app/imports/parser.py`, `schemas.py`, `service.py`, `routes.py` | Разбор, предпросмотр, подтверждение и транзакционная запись |
| Повтор запросов | `backend/app/operations/models.py`, `service.py` | Сохранённые результаты идемпотентных операций |
| Обучение | `backend/app/learning/models.py`, `schemas.py`, `scheduler.py`, `queue.py`, `service.py`, `routes.py` | FSRS, очередь, состояния направлений и журнал оценок |
| Миграции | `backend/migrations/env.py`, `backend/migrations/versions/` | Последовательные миграции по задачам 1–5 |
| Основа UI | `frontend/package.json`, `package-lock.json`, `index.html`, `tsconfig.json`, `vite.config.ts`, `src/main.tsx`, `src/App.tsx` | Вход и навигация |
| Интеграция UI | `frontend/src/api/client.ts`, `types.ts`, `auth.ts`, `groups.ts`, `cards.ts`, `imports.ts`, `learning.ts`; `src/telegram/bridge.ts` | Типизированные запросы, Telegram и обработка ошибок |
| Экраны UI | `frontend/src/features/groups/GroupPage.tsx`, `cards/WordListPage.tsx`, `cards/CardEditor.tsx`, `imports/ImportPage.tsx`, `learning/StudyHome.tsx`, `learning/ReviewPage.tsx` | Пользовательские сценарии |
| Общие компоненты | `frontend/src/components/Button.tsx`, `Notice.tsx`, `Tabs.tsx`, `ConfirmDialog.tsx`, `FlashCard.tsx`, `RatingControls.tsx`; `src/styles/tokens.css`, `global.css` | Дизайн-система |
| Проверки | `backend/tests/`, `frontend/src/**/*.test.tsx`, `frontend/e2e/` | Прикладные, интеграционные и сквозные проверки |
| Передача результата | `README.md`, `docs/deployment.md`, `docs/verification.md` | Запуск, переменные окружения, реальные результаты проверок |

Указанные внутри строки пути вроде `schemas.py` находятся в том же каталоге, что первый полный путь строки. Пустые `__init__.py` создаются для Python-пакетов. Доменные сервисы не импортируют FastAPI; маршруты преобразуют HTTP-запросы в вызовы сервисов.

## Общие контракты

- Идентификаторы внутренних объектов — UUID, Telegram ID — 64-битное целое. Нельзя доверять Telegram ID из тела запроса вместо аутентифицированного пользователя.
- `Actor` из `auth/schemas.py`: `user_id: UUID`, `telegram_id: int`, `display_name: str`.
- `CardTarget` из `cards/schemas.py`: дискриминируемое объединение `PersonalTarget(visibility="personal")` и `GroupTarget(visibility="group", group_id: UUID)`. Владелец личной карточки всегда берётся из Actor.
- `CardView`: `id`, `front`, `back`, `visibility`, `group_id`, `version`, `can_edit`, `can_delete`. Имена автора и сведения о прогрессе в учебную карточку не передаются как отображаемый контент.
- `Direction`: `en_ru` или `ru_en`. `Rating`: целое 1, 2, 3 или 4.
- `DomainError(code: str, message: str, status: int, details: dict)` преобразуется в HTTP-ответ `{"error":{"code":"FORBIDDEN","message":"Недостаточно прав","details":{}}` с соответствующим статусом. Конфликты версий и подтверждений — 409, отсутствие доступа — 403, неизвестный/чужой частный объект — 404, ошибки содержимого — 422.
- После проверки Telegram вход выдаёт подписанный Bearer-токен на 12 часов, с `sub` равным внутреннему UUID и проверяемыми `iss`, `aud`, `exp`. Токен хранится только в памяти UI. `initData` принимается при возрасте не больше 1 часа и опережении серверных часов не больше 60 секунд. При истечении доступа UI предлагает заново открыть Mini App.
- Для подписей сессий и предпросмотра используются разные назначения ключей. Секрет приложения и бот-токен поступают через окружение; ID издателя задан в исходном коде, не в окружении.
- Изменение карточки не меняет её видимость или группу. Публикация личной карточки через PATCH невозможна; общая создаётся отдельной разрешённой операцией.
- Все пакетные добавления и оценки принимают `Idempotency-Key` в виде UUID. Проверки выполняются в порядке: актуальный доступ → сохранённый результат операции → проверка версии/предпросмотра → изменения и запись результата в одной транзакции.
- API использует префикс `/api`. Неизвестные `/api`-маршруты возвращают 404, а не HTML приложения.

---

### Task 1: Запускаемое приложение и Telegram-вход

**Files:** создать файлы запуска, Python-проекта, основы API, входа и основы UI из карты; `backend/migrations/versions/0001_users.py`; `backend/tests/conftest.py`, `backend/tests/auth/test_telegram.py`, `test_sessions.py`; `frontend/src/api/auth.test.ts`; начальный `README.md`.

**Interfaces:**
- Produces: `create_app(settings: Settings) -> FastAPI`, `get_session() -> Iterator[Session]`, `utc_now() -> datetime`, `get_current_actor() -> Actor` как FastAPI dependency.
- Produces: `validate_init_data(raw: str, bot_token: str, now: datetime) -> TelegramIdentity`; `TelegramIdentity` содержит проверенные `telegram_id`, `display_name`, `auth_date`, `start_param: str | None`.
- Produces: `POST /api/auth/telegram {init_data}` → `{access_token, token_type, expires_in, user}`; `GET /api/me` → Actor; `GET /api/health` → `{status: "ok"}`.
- Test fixtures: `client`, `signed_init_data(telegram_id: int, auth_date: datetime | None = None) -> str`, `auth_headers(telegram_id: int) -> dict[str, str]`. Подписанные данные строятся тестовым токеном; фиксированные часы — 14 октября 2026 года, 12:00 UTC. Ни тестовые секреты, ни обход входа не попадают в production-конфигурацию.

- [ ] **1. Подготовить тестовый контур входа.** Создать минимальные конфигурации пакетов, контейнеров и тестовые фикстуры. `compose.test.yaml` имеет отдельное имя проекта `language-cards-test`, отдельную PostgreSQL в tmpfs, сервисы `api-test` и `web-test`. Не подключать тесты к рабочим volume. В `tests/auth/test_telegram.py` зафиксировать успешный вход и отказ при неверной подписи:

```python
def test_valid_telegram_login(client, signed_init_data):
    response = client.post("/api/auth/telegram", json={"init_data": signed_init_data(1568151709)})
    assert response.status_code == 200
    assert response.json()["user"]["telegram_id"] == 1568151709
    assert response.json()["expires_in"] == 43200

def test_tampered_init_data_is_rejected(client, signed_init_data):
    raw = signed_init_data(1568151709) + "&auth_date=0"
    assert client.post("/api/auth/telegram", json={"init_data": raw}).status_code == 401
```

- [ ] **2. Запустить красную проверку.** `docker compose -f compose.test.yaml run --build --rm api-test pytest tests/auth -q`. Ожидается падение из-за отсутствующего поведения входа, а не подключения к сети/БД. После настройки фикстур отдельно покрыть подмену user, повторяющиеся поля, просроченный `auth_date`, время из будущего и истёкший Bearer-токен.
- [ ] **3. Реализовать вход и хранение пользователя.** Проверять HMAC и временные границы по [правилам Telegram](https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app), сравнивать подписи в постоянном времени, отклонять неоднозначные дубли полей. Создать миграцию пользователей с уникальным Telegram ID. Токен сессии выдавать через PyJWT с фиксированным алгоритмом HS256; не принимать алгоритм из пользовательских настроек.
- [ ] **4. Реализовать минимальный вход UI.** `bootstrapAuth(initData: string): Promise<Actor>` сохраняет токен в памяти. `apiFetch<T>(path: string, init?: RequestInit): Promise<T>` добавляет авторизацию и разбирает DomainError. `bridge.ts` читает Telegram API и отдаёт отсутствие контекста явно. Вне Telegram показывать «Открой приложение в Telegram»; тесты подменяют окружение только из тестового кода.
- [ ] **5. Проверить результат.** Повторить pytest из шага 2: PASS. `docker compose -f compose.test.yaml run --build --rm web-test npm test -- --run src/api/auth.test.ts`: PASS. `/api/me` без токена возвращает 401, `/api/health` — 200; неизвестный `/api`-маршрут — 404.
- [ ] **6. Зафиксировать изменения.** Если Git всё ещё отсутствует, инициализировать его в корне проекта после проверки границы каталога; учесть sandbox-разрешения. Добавить только созданные исходники, lock-файлы и документацию, исключить секреты. Коммит: `feat: bootstrap app and Telegram authentication`.

### Task 2: Группы, приглашения и единственный издатель

**Files:** создать `backend/app/groups/{models,schemas,policy,service,routes}.py`, `backend/migrations/versions/0002_groups.py`, `backend/tests/groups/test_policy.py`, `test_membership.py`, `test_invitations.py`; создать `frontend/src/api/groups.ts`, `frontend/src/features/groups/GroupPage.tsx`, `GroupPage.test.tsx`; изменить регистрацию маршрутов и UI-навигацию.

**Interfaces:**
- Consumes: Actor, Session, `get_current_actor`, DomainError и часы из задачи 1.
- Produces: `SHARED_CARD_PUBLISHER_TELEGRAM_ID: int = 1568151709`; `can_publish_shared(telegram_id: int, is_member: bool) -> bool` в `groups/policy.py`.
- Produces: `require_membership(db: Session, actor: Actor, group_id: UUID) -> Membership`, `create_group(db: Session, actor: Actor, name: str) -> GroupView`, `join_group(db: Session, actor: Actor, token: str) -> GroupView`.
- Routes: `GET/POST /api/groups`, `GET /api/groups/{group_id}`, `POST /api/groups/{group_id}/invitation`, `GET /api/invitations/{token}`, `POST /api/invitations/{token}/join`, `DELETE /api/groups/{group_id}/membership`.
- `GroupView`: `id`, `name`, `owner_id`, `is_owner`, `can_add_shared`, список участников с `user_id` и `display_name`. Только создатель выпускает/заменяет приглашение; только текущие участники получают подробности группы.
- Test fixture: `make_group(owner_telegram_id: int, member_telegram_ids: list[int]) -> UUID` создаёт группу и членство через сервисы.

- [ ] **1. Записать тест правила без привязки к интерфейсу.**

```python
import pytest
from app.groups.policy import can_publish_shared

@pytest.mark.parametrize("telegram_id,is_member,expected", [
    (1568151709, True, True),
    (1568151709, False, False),
    (2000000001, True, False),
    (2000000002, True, False),
])
def test_single_shared_publisher(telegram_id, is_member, expected):
    assert can_publish_shared(telegram_id, is_member) is expected
```

- [ ] **2. Запустить красную проверку.** `docker compose -f compose.test.yaml run --build --rm api-test pytest tests/groups -q`: ожидается FAIL из-за отсутствующего модуля/правила. Добавить `test_missing_publisher_constant_denies`, `test_duplicate_join_keeps_one_membership`, `test_rotated_invitation_is_invalid`, `test_owner_cannot_leave`, `test_group_owner_is_not_automatically_publisher` с явными ожидаемыми отказами/числом записей.
- [ ] **3. Реализовать модели, политику и API.** Уникальность `(group_id, user_id)`; имя группы после trim — 1–120 символов. Токен приглашения — 32 случайных байта в URL-safe форме, в БД только хеш. Публичный предпросмотр приглашения для аутентифицированного пользователя выдаёт только название группы. Замена токена атомарно отзывает прежний. Пользовательский `start_param` служит лишь указателем на приглашение; права подтверждаются через БД.
- [ ] **4. Реализовать GroupPage.** Название, участники, создание, вступление, ссылка у создателя и выход у обычного участника. Активная группа сохраняется в локальном хранилище только как предпочтение и проверяется по серверному списку при запуске. Невалидный выбор переводит в личный режим.
- [ ] **5. Проверить результат.** Pytest из шага 2 — PASS; `docker compose -f compose.test.yaml run --build --rm web-test npm test -- --run src/features/groups/GroupPage.test.tsx` — PASS. UI не предлагает публикацию общих карточек другому создателю группы; сам по себе ID активной группы не даёт доступа.
- [ ] **6. Зафиксировать изменения.** Коммит: `feat: add groups and fixed shared-card publisher policy`.

### Task 3: Словарь и управление карточками

**Files:** создать `backend/app/cards/{models,schemas,policy,service,routes}.py`, `backend/migrations/versions/0003_cards.py`, `backend/tests/cards/test_permissions.py`, `test_versions.py`, `test_listing.py`; создать `frontend/src/api/cards.ts`, `frontend/src/features/cards/WordListPage.tsx`, `CardEditor.tsx`, `WordListPage.test.tsx`; изменить `App.tsx`.

**Interfaces:**
- Consumes: Actor, CardTarget, `require_membership`, `can_publish_shared`.
- Produces: `require_create_access(db: Session, actor: Actor, target: CardTarget) -> None`, `create_card(db: Session, actor: Actor, target: CardTarget, front: str, back: str) -> CardView`, `update_card(db: Session, actor: Actor, card_id: UUID, front: str, back: str, expected_version: int) -> CardView`, `delete_card(db: Session, actor: Actor, card_id: UUID, expected_version: int) -> None`.
- Routes: `GET /api/cards?group_id&filter&q&offset&limit`, `POST /api/cards`, `PATCH/DELETE /api/cards/{card_id}`. `filter`: `all`, `shared`, `personal`; лимит страницы 50, максимум 100. Личный режим без group_id содержит только личные карточки.
- Fixture: `make_card(actor_telegram_id: int, target: CardTarget, front: str, back: str) -> CardView` вызывает сервис, не обходит политику.

- [ ] **1. Зафиксировать матрицу доступа в тестах.** `test_member_cannot_create_shared` и `test_other_owner_cannot_create_shared`: POST → 403 и число карточек не изменилось. `test_publisher_requires_membership`: 403. `test_personal_card_is_private`: другой участник и создатель получают 404 по ID. `test_visibility_cannot_change_via_patch`: запрос с изменением visibility → 422. `test_author_edits_own_and_owner_edits_any`: разрешённые изменения → 200; остальные → 403. `test_only_owner_deletes_shared`: автор, который не владелец группы, получает 403.
- [ ] **2. Запустить красную проверку.** `docker compose -f compose.test.yaml run --build --rm api-test pytest tests/cards -q`: ожидается FAIL по отсутствующим маршрутам/поведению.
- [ ] **3. Реализовать модель, политику и операции.** CHECK-ограничение для group/private владения; текстовые стороны длиной 1–2 000 символов, версия начинается с 1. PATCH допускает только стороны и expected_version; DELETE — мягкий. Поиск литеральный, без превращения `%` и `_` в произвольные шаблоны. Текст никогда не рендерится как HTML. Изменения чужого/неактуального состояния отклоняются, расписание при правке текста не сбрасывается.
- [ ] **4. Реализовать словарь и редактор.** Поиск по обеим сторонам, фильтры, просмотр пары, редактирование и подтверждение удаления по `can_edit/can_delete`. При конфликте сохранять введённый текст и предлагать загрузить актуальную карточку. Обычный участник добавляет личные слова; выбор общего места виден только при `can_add_shared`.
- [ ] **5. Проверить результат.** Команда шага 2 — PASS; `docker compose -f compose.test.yaml run --build --rm web-test npm test -- --run src/features/cards/WordListPage.test.tsx` — PASS. Дополнительные проверки: XSS-текст остаётся текстом, устаревшая версия → 409, выход автора не удаляет общую карточку.
- [ ] **6. Зафиксировать изменения.** Коммит: `feat: add shared and personal vocabulary management`.

### Task 4: Импорт списка с предпросмотром и безопасным повтором

**Files:** создать `backend/app/imports/{parser,schemas,service,routes}.py`, `backend/app/operations/{models,service}.py`, `backend/migrations/versions/0004_operations.py`; тесты `backend/tests/imports/test_parser.py`, `test_preview.py`, `test_commit.py`, `test_concurrency.py`; UI `frontend/src/api/imports.ts`, `frontend/src/features/imports/ImportPage.tsx`, `ImportPage.test.tsx`; изменить переход добавления из словаря.

**Interfaces:**
- Consumes: Actor, CardTarget, `require_create_access`, модель Card и подписи из задачи 1.
- Produces: `parse_list(text: str) -> list[ImportRow]`, `fingerprint(front: str, back: str) -> str`.
- `ImportRow`: `row_id: int`, `original: str`, `front: str | None`, `back: str | None`, `selected: bool`, `keep_duplicate: bool`, `error: str | None`, `duplicate: bool`. Номер — исходная строка; некорректная строка остаётся видимой и выбранной до исправления/явного исключения. Новый дубликат по умолчанию исключён.
- `PreviewRequest`: target и ровно одно из `text` или `rows`. `ImportPreview`: нормализованные rows, число выбранных пар, ошибки, `confirmation_token: str | None`. Токен выдаётся только для корректного выбранного набора, действует 1 час и подписывает хеш нормализованных строк, места назначения, пользователя и снимка найденных дубликатов; сам текст внутрь токена не включается.
- Routes: `POST /api/imports/preview`; `POST /api/imports/commit` принимает target, rows, confirmation_token и `Idempotency-Key`, возвращает `{created_ids, created_count}`. После правки строк или флажков UI получает свежий предпросмотр; новый конфликт требует повторного просмотра.
- Produces: `get_operation_result(db: Session, actor: Actor, kind: str, key: UUID, request_hash: str) -> dict | None`; `save_operation_result(db: Session, actor: Actor, kind: str, key: UUID, request_hash: str, response: dict) -> None`. Сервис не выполняет самостоятельный commit; внешний сервис управляет общей транзакцией.

- [ ] **1. Записать тесты разбора исходного формата.**

```python
from app.imports.parser import parse_list

def test_phrase_slashes_and_nbsp_are_preserved():
    rows = parse_list("Receive - получать/принимать\u00a0\n\nHigh priest — первосвященник")
    assert [(row.front, row.back) for row in rows] == [
        ("Receive", "получать/принимать"),
        ("High priest", "первосвященник"),
    ]

def test_unstructured_line_remains_visible():
    source = 'Выражение it depends означает "в зависимости от обстоятельств"'
    row = parse_list(source)[0]
    assert row.original == source
    assert row.error is not None
    assert row.selected is True
```

- [ ] **2. Запустить красную проверку.** `docker compose -f compose.test.yaml run --build --rm api-test pytest tests/imports -q`: ожидается FAIL. Дополнить проверки для 501 строки, 2 001 символа, CRLF, дефиса внутри `mother-in-law`, пояснений `Cell`, NFC, `Provision`, разных переводов одного слова и пустой стороны.
- [ ] **3. Реализовать parser и preview.** Делить по первому внутристочному `[\t \u00a0]+[-–—][\t \u00a0]+`; переносы строк не являются частью разделителя. Сравнительный fingerprint использует NFC, casefold и схлопывание пробелов, отображаемое содержимое сохраняет регистр и внутреннюю пунктуацию. Предел HTTP-тела — 32 MiB, чтобы вместить предельный пакет вместе с исходными строками и JSON-экранированием; ограничения 500 строк и 2 000 символов на сторону проверяются отдельно. Предпросмотр не создаёт карточек и не изменяет обучение.
- [ ] **4. Реализовать commit и идемпотентность.** Проверять издателя и членство до записи. В транзакции группового импорта блокировать строку группы, личного — строку пользователя; искать receipt уже под этой блокировкой. Если результата ещё нет, повторно проверять токен и снимок дубликатов. Неверный токен, изменённые строки или новые дубли → 409 без частичного сохранения. Повтор успешного ключа возвращает сохранённый ответ раньше повторной проверки снимка; иной payload под тем же ключом → 409. `OperationReceipt` имеет уникальность `(user_id, kind, key)`.
- [ ] **5. Реализовать UI предпросмотра.** Выбор назначения по правам, вставка, редактирование сторон, исключение строки, явное сохранение дубликата. Ошибочные выбранные строки блокируют добавление. Сетевая ошибка сохраняет текст, строки и ключ уже отправленной операции; исправление содержимого начинает новую операцию.
- [ ] **6. Проверить реальные сбои.** `test_replay_after_success_keeps_same_created_ids`: два запроса → одинаковые ID и одна запись на выбранную пару. `test_concurrent_import_returns_duplicate_conflict`: второй импорт не создаёт скрытый повтор. `test_nonpublisher_bulk_import_is_forbidden`: 403 даже при самостоятельно сформированном запросе. Запустить все tests/imports и `docker compose -f compose.test.yaml run --build --rm web-test npm test -- --run src/features/imports/ImportPage.test.tsx`: PASS.
- [ ] **7. Зафиксировать изменения.** Коммит: `feat: import vocabulary lists with preview and idempotency`.

### Task 5: Персональное расписание и сервис повторения

**Files:** создать `backend/app/learning/{models,schemas,scheduler,queue,service,routes}.py`, `backend/migrations/versions/0005_learning.py`; тесты `backend/tests/learning/test_scheduler.py`, `test_queue.py`, `test_reviews.py`, `test_concurrency.py`; создать `frontend/src/api/learning.ts`.

**Interfaces:**
- Consumes: Actor, Card, доступ к группам/карточкам, операции из задачи 4 и внедряемые часы.
- Produces: `build_scheduler() -> fsrs.Scheduler`; `schedule_review(state_json: str | None, rating: Rating, reviewed_at: datetime) -> ScheduledReview` в `scheduler.py`; `ScheduledReview` содержит `state_json: str`, `due_at: datetime`.
- Produces: `get_next_item(db: Session, actor: Actor, group_id: UUID | None, last_card_id: UUID | None, now: datetime) -> LearningItem | None`; `submit_review(db: Session, actor: Actor, command: ReviewCommand, key: UUID, now: datetime) -> ReviewOutcome`.
- `LearningItem`: `card_id`, `direction`, `question`, `answer`, `content_version`, `state_version`. `ReviewCommand`: `card_id`, `direction`, `rating`, `group_id`, `expected_content_version`, `expected_state_version`. `ReviewOutcome`: `event_id`, `state_version`, `due_at`.
- Routes: `GET /api/learning/summary?group_id` → `{due_count, new_count, can_start}`; `GET /api/learning/next?group_id&last_card_id` → LearningItem или 204; `POST /api/learning/reviews` с командой и ключом операции → ReviewOutcome. Счётчик due_count считает наступившие задания, new_count — новые направления. `can_start` использует правила get_next_item, включая допустимые короткие будущие шаги.

- [ ] **1. Зафиксировать тесты поведения.** `test_again_returns_new_item_to_short_learning`: новая карточка с Again имеет ближайший шаг 1 минута. `test_easy_graduates_new_item`: Easy переводит её из короткого обучения. `test_directions_are_independent` и `test_users_are_independent`: изменяется только одна тройка `(user, card, direction)`. В тестах используются фиксированные UTC-часы; не требовать конкретного случайно варьируемого многодневного интервала.
- [ ] **2. Запустить красную проверку.** `docker compose -f compose.test.yaml run --build --rm api-test pytest tests/learning -q`: ожидается FAIL по отсутствующей реализации.
- [ ] **3. Реализовать адаптер FSRS и модели.** Настройки из Global Constraints передавать явно; коэффициенты брать у зафиксированной версии библиотеки. Создать StudyState с уникальной тройкой и ReviewEvent с версией текста; индексировать пользователь/срок. Отсутствие состояния означает новое направление, создаваемое при первой оценке. Не сохранять review_duration и длительность сессии.
- [ ] **4. Реализовать очередь.** Короткие наступившие шаги → остальные наступившие → новые → короткие будущие в пределах 20 минут, только когда предыдущие категории пусты. Соблюсти разнесение обратной стороны в пределах категории, если есть альтернатива. Обычные будущие повторения не выдавать досрочно. В выбранной группе объединять общие карточки и глобальные личные; без группы выдавать только личные.
- [ ] **5. Реализовать транзакцию оценки.** Сериализовать конкурирующие оценки одного пользователя блокировкой строки пользователя. Проверить актуальный доступ, затем receipt; только для новой операции проверять допустимость задания и версии содержимого/состояния. Иначе успешный повтор запроса мог бы ошибочно отклониться из-за уже изменившегося срока. Запись состояния, события и receipt атомарна. До первой оценки expected_state_version равен 0. Ошибка/устаревшая версия не меняет состояние. Самостоятельная оценка остаётся пользовательским действием, а не проверкой текста.
- [ ] **6. Проверить пограничные случаи.** `test_response_loss_replay_has_one_event`, `test_two_devices_conflict`, `test_edited_card_rejects_stale_rating`, `test_deleted_card_rejects_rating`, `test_left_group_rejects_rating`, `test_learning_ahead_excludes_future_reviews`, `test_opposite_direction_uses_available_alternative`, `test_summary_allows_early_learning_with_zero_due` и `test_no_remaining_items_returns_204`. Команда шага 2 должна завершиться PASS.
- [ ] **7. Зафиксировать изменения.** Коммит: `feat: add independent FSRS learning and review queues`.

### Task 6: Минимальная карточка и законченный мобильный интерфейс

**Files:** создать общие компоненты и стили из карты; `frontend/src/features/learning/StudyHome.tsx`, `ReviewPage.tsx`, `ReviewPage.test.tsx`, `frontend/src/components/FlashCard.test.tsx`, `frontend/src/telegram/bridge.test.ts`; изменить `App.tsx`, существующие экраны и `types.ts` по API задач 1–5.

**Interfaces:**
- Consumes: LearningItem, ReviewOutcome, `apiFetch`, `GroupView.can_add_shared` и CardView.
- Produces: `FlashCard(props: {question: string; answer: string; revealed: boolean; onReveal: () => void})`; `RatingControls(props: {disabled: boolean; onRate: (rating: 1 | 2 | 3 | 4) => void})`.
- Produces: `applyTelegramTheme(theme: TelegramTheme): void`, `subscribeTelegramLayout(onChange: () => void): () => void`; интерфейс TelegramTheme содержит доступные themeParams, colorScheme и safe-area значения с резервными CSS-значениями.
- ReviewPage имеет состояния `loading`, `question`, `answer`, `saving`, `retry`, `empty`; вопрос/ответ и текущий ключ операции сохраняются при retry.

- [ ] **1. Записать тест минимального содержимого.**

```tsx
import { render, screen, within } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { FlashCard } from "./FlashCard";

it("shows only the two text sides after reveal", () => {
  render(<FlashCard question="Purpose" answer="цель" revealed={true} onReveal={vi.fn()} />);
  const card = screen.getByTestId("flash-card");
  expect(card.textContent).toBe("Purposeцель");
  expect(within(card).queryByRole("button", { name: "Легко" })).toBeNull();
  expect(within(card).queryByText("английский → русский")).toBeNull();
});
```

- [ ] **2. Запустить красную проверку.** `docker compose -f compose.test.yaml run --build --rm web-test npm test -- --run src/components/FlashCard.test.tsx src/features/learning/ReviewPage.test.tsx`: ожидается FAIL по отсутствующему компоненту/поведению. Добавить `answer_is_hidden_until_reveal`, `ratings_are_outside_card`, `double_tap_does_not_rate_next_item`, `retry_reuses_key_and_preserves_answer`.
- [ ] **3. Реализовать компоненты и дизайн-токены.** Перенести значения из раздела 7 спецификации без новой палитры. Сохранять видимый фокус, 2 × 2 оценки, минимум 56 px высоты, перенос длинного текста, safe area и reduced motion. Контраст цветов темы проверять вычислением относительной яркости; при недостатке использовать согласованные резервные пары.
- [ ] **4. Реализовать экраны обучения.** На главной — выбор набора, счётчики заданий и «Начать»; доступность кнопки определяется `can_start`, а не одной суммой счётчиков. На учебной карточке только question и, после нажатия, answer; кнопка раскрытия, оценки, навигация и ошибки расположены вне неё. Направление используется для выбора текста, но не выводится. После успешной оценки загружать следующее задание; сетевой сбой оставляет текущее раскрытым. При 409 из-за изменённого текста/состояния объяснить ситуацию вне карточки и запросить актуальное задание с закрытым ответом.
- [ ] **5. Довести общую навигацию и доступность.** Три раздела, отсутствие нижних вкладок на тренировке, корректный BackButton. Кликабельная карточка доступна с клавиатуры и имеет aria-label «Показать ответ» без добавления видимого текста. Экранный диктор получает ответ после раскрытия. Нет таймера, автоматического перелистывания и полей ответа; обычному участнику не предлагается групповое добавление.
- [ ] **6. Проверить UI.** Повторить команду шага 2 и `docker compose -f compose.test.yaml run --build --rm web-test npm test -- --run`: PASS. `docker compose -f compose.test.yaml run --build --rm web-test npm run build`: успешная проверка TypeScript и сборка. Оставить числовую проверку цветов и изображения состояний для задачи 7.
- [ ] **7. Зафиксировать изменения.** Коммит: `feat: build minimal flashcard learning interface`.

### Task 7: Сквозная проверка и передача запускаемого приложения

**Files:** создать `frontend/playwright.config.ts`, `frontend/e2e/telegram.ts`, `app.spec.ts`, `failure-recovery.spec.ts`, `backend/tests/e2e_seed.py`, `docs/deployment.md`, `docs/verification.md`; завершить `Dockerfile`, `compose.yaml`, `compose.test.yaml`, `README.md`.

**Interfaces:**
- Consumes: все HTTP-контракты, миграции и UI из задач 1–6.
- Produces: Docker-образ с готовым UI и API, команды запуска и миграций, проверенные сценарии AC01–AC19 и отчёт о фактических результатах.
- E2E-контур: отдельные сервисы `api-e2e` и `browser-test`, тестовая БД и известный только тестовому окружению бот-токен. Playwright подставляет подписанные тестовые initData в Telegram bridge; production API не содержит bypass-эндпоинта. Издатель в сценариях — `1568151709`, второй участник — `2000000001`, другой создатель — `2000000002`.

- [ ] **1. Создать сквозные сценарии.** Издатель создаёт группу и импортирует `Purpose - цель`, `Receive - получать/принимать`, повтор `Provision`, строку без разделителя. Второй участник вступает, видит общий набор, добавляет личную пару, повторяет оба направления. Проверить независимость прогресса, закрытость личных карточек и отказ второму создателю в групповом добавлении через UI и API.
- [ ] **2. Проверить первоначальное выполнение сценариев.** `docker compose -f compose.test.yaml run --build --rm browser-test npm run test:e2e`. Ожидается либо выявление конкретной интеграционной ошибки, либо PASS, если реализация уже соответствует сценариям; не создавать искусственный сбой ради красного результата.
- [ ] **3. Проверить потерю ответа и перезапуск.** Оборвать доставку HTTP-ответа после сохранения, повторить запрос с тем же ключом и проверить одну запись. Перезапустить тестовый API без удаления БД и проверить сохранённый словарь/расписание. Не использовать пользовательскую БД или команды удаления её volume.
- [ ] **4. Провести визуальную проверку.** Снять и просмотреть изображения при 320 и 390 px, в обеих темах: закрытая/раскрытая карточка, длинная фраза, четыре оценки, ошибка сохранения, импорт с дублем и ошибкой. Автоматически проверить расположение оценок вне `.flash-card` и отсутствие переполнения; проверить контраст заданных пар и клавиатурную навигацию. Отдельно записать результаты ручного прогона в реальном Telegram, когда будет доступен настроенный бот и HTTPS-адрес; отсутствие этой внешней проверки обозначить явно.
- [ ] **5. Завершить инструкции эксплуатации.** Описать обязательные `BOT_TOKEN`, `APP_SECRET`, `DATABASE_URL`, публичный HTTPS-адрес и имя бота без выдуманных значений; для ID издателя указать фактическую константу. Multi-stage сборка Node → Python, миграции отдельной командой `docker compose run --rm app alembic upgrade head`, база с постоянным volume и закрытым внешним портом. Документировать резервное копирование/восстановление базы и настройку Main Mini App. Не публиковать приложение и не создавать бот от имени пользователя в рамках этого этапа.
- [ ] **6. Выполнить итоговые проверки.** `docker compose -f compose.test.yaml run --build --rm api-test pytest -q`; `docker compose -f compose.test.yaml run --build --rm web-test npm test -- --run`; `docker compose -f compose.test.yaml run --build --rm web-test npm run build`; E2E-команда шага 2; `docker compose -f compose.test.yaml config --quiet`. В отчёте перечислить фактический результат, ограничения и соответствие AC, не объявлять непроведённые проверки пройденными.
- [ ] **7. Зафиксировать результат.** Коммит: `test: verify collaborative flashcard workflows and document deployment`.

## Покрытие спецификации и ревью плана

| Требования / критерии | Задачи |
| --- | --- |
| R01, R02; AC12, AC17 | 1, 7; текущий план и проверка трассировки |
| R03, R12; AC01, AC09–AC12, AC16 | 5, 7 |
| R04–R06; AC02–AC04, AC19 | 2, 3, 4, 7 |
| R07–R09; AC05–AC07 | 4, 7 |
| R10–R11, R15; AC08, AC18 | 5, 6, 7 |
| R13–R14; AC13–AC14 | 5, 6, 7 |
| Дизайн-система; AC15 | 6, 7 |

Самопроверка плана: все R01–R15 и AC01–AC19 сопоставлены задачам; пять условий Review Focus имеют конкретные проверки; числовой ID издателя и порядок проверок при повторе запроса совпадают между задачами. Git-коммиты относятся к будущей реализации, а не к текущему состоянию каталога.

Для выполнения рекомендован **Native**: реализация в этом чате одним исполнителем с итоговым независимым ревью. Семь задач последовательно используют общие контракты доступа, карточек и обучения, поэтому параллельная реализация не является основным преимуществом. **Subagent-driven** остаётся альтернативой: отдельный исполнитель и проверки для каждой задачи, затем итоговое ревью. Пользователь выбирает способ после просмотра плана; Spec-Driven Development сохраняется в обоих вариантах.
