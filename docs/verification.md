# Отчёт проверки

Документ фиксирует команды и ожидаемое покрытие. Фактические результаты последнего прогона обновляются только после выполнения всех команд.

## Автоматические проверки

```bash
docker compose -f compose.test.yaml run --build --rm api-test pytest -q
docker compose -f compose.test.yaml run --build --rm web-test npm test -- --run
docker compose -f compose.test.yaml run --build --rm web-test npm run build
docker compose -f compose.test.yaml run --build --rm browser-test npm run test:e2e
docker compose -f compose.test.yaml config --quiet
python3 -m unittest tests/test_deployment.py
```

Сохранность данных после перезапуска проверяется только на изолированной тестовой БД:

```bash
docker compose -f compose.test.yaml up -d --build api-e2e
docker compose -f compose.test.yaml run --rm -e E2E_BASE_URL=http://api-e2e:8000 api-test python -m tests.e2e_seed seed
docker compose -f compose.test.yaml restart api-e2e
docker compose -f compose.test.yaml run --rm -e E2E_BASE_URL=http://api-e2e:8000 api-test python -m tests.e2e_seed verify
```

Volume пользовательской базы эти команды не затрагивают; тестовая БД использует `tmpfs`.

## Фактический результат 15 октября 2026

- Backend в Python 3.13 Docker: `74 passed`; одно предупреждение об устаревающем alias Starlette/AnyIO, не влияющее на выполнение.
- Frontend в Node 24 Docker: `30 passed`.
- Production-сборка React/Vite: успешно.
- Playwright/Chromium: `10 passed`, включая функциональный, recovery и визуальные сценарии, открытие приглашения по `start_param`, реальную потерю ответа после commit с повтором того же ключа, конкурентное изменение карточки и конкурентную оценку одного задания в PostgreSQL.
- Перезапуск: seed и verify подтвердили ту же карточку, `StudyState` версии 1, срок следующего показа и одно событие повторения после restart API прямой проверкой PostgreSQL.
- Compose-конфигурации: валидны.
- Production deployment: `3 passed`; проверены изоляция FastAPI/PostgreSQL, HTTPS reverse proxy, Certbot volumes и shell-синтаксис deploy-скрипта.
- Nginx `1.28-alpine`: обе конфигурации прошли `nginx -t`; контейнерная проверка подтвердила, что production Host принимается, а посторонний Host получает `444`.
- `npm audit`: `0 vulnerabilities`.
- Реальные Let's Encrypt, DNS и Telegram Bot API не проверялись локально: эти проверки выполняет deploy-скрипт на production-сервере.

## Трассировка критериев приёмки

- AC01–AC04, AC09, AC11, AC19: API- и E2E-сценарии ролей, вступления, приватности, обоих направлений и идемпотентности.
- AC05–AC07: тесты парсера, предпросмотра, ошибок строк и дубликатов.
- AC08, AC14, AC18: компонентные и браузерные тесты закрытой/раскрытой карточки и четырёх внешних оценок.
- AC10: детерминированные тесты FSRS для «Снова» и «Легко».
- AC12: seed → перезапуск API → verify через API и прямой запрос состояния/события в одной тестовой БД.
- AC13: проверка спецификации и интерфейса; таймеры, цели и напоминания отсутствуют.
- AC15: скриншоты Playwright на 320/390 px, обе темы, длинная фраза, оценки и ошибка; автоматическая проверка переполнения, позиции кнопок, контраста и клавиатурного фокуса.
- AC16–AC17: backend-тесты удалённых/недоступных карточек и подписанного Telegram initData.

## Внешняя ручная проверка

Ручной прогон в настоящем Telegram возможен только после появления настроенного бота и публичного HTTPS-адреса. До этого момента он считается **не проведённым**, а не пройденным. После развёртывания нужно проверить Main Mini App, обе темы, safe-area, системную кнопку Back и повторное открытие приложения.
