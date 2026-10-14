# Отчёт проверки

Документ фиксирует команды и ожидаемое покрытие. Фактические результаты последнего прогона обновляются только после выполнения всех команд.

## Автоматические проверки

```bash
docker compose -f compose.test.yaml run --build --rm api-test pytest -q
docker compose -f compose.test.yaml run --build --rm web-test npm test -- --run
docker compose -f compose.test.yaml run --build --rm web-test npm run build
docker compose -f compose.test.yaml run --build --rm browser-test npm run test:e2e
docker compose -f compose.test.yaml config --quiet
```

Сохранность данных после перезапуска проверяется только на изолированной тестовой БД:

```bash
docker compose -f compose.test.yaml up -d --build api-e2e
docker compose -f compose.test.yaml run --rm -e E2E_BASE_URL=http://api-e2e:8000 api-test python tests/e2e_seed.py seed
docker compose -f compose.test.yaml restart api-e2e
docker compose -f compose.test.yaml run --rm -e E2E_BASE_URL=http://api-e2e:8000 api-test python tests/e2e_seed.py verify
```

Volume пользовательской базы эти команды не затрагивают; тестовая БД использует `tmpfs`.

## Фактический результат 14 октября 2026

- Backend в Python 3.13 Docker: `66 passed`; одно предупреждение об устаревающем alias Starlette/AnyIO, не влияющее на выполнение.
- Frontend в Node 24 Docker: `21 passed`.
- Production-сборка React/Vite: успешно.
- Playwright/Chromium: `6 passed`, включая функциональный, recovery и визуальные сценарии.
- Перезапуск: seed и verify подтвердили ту же карточку и сохранённое расписание после restart API.
- Compose-конфигурации: валидны.
- `npm audit`: `0 vulnerabilities`.
- Реальный Telegram: не проверялся, потому что бот и публичный HTTPS-адрес ещё не настроены.

## Трассировка критериев приёмки

- AC01–AC04, AC09, AC11, AC19: API- и E2E-сценарии ролей, вступления, приватности, обоих направлений и идемпотентности.
- AC05–AC07: тесты парсера, предпросмотра, ошибок строк и дубликатов.
- AC08, AC14, AC18: компонентные и браузерные тесты закрытой/раскрытой карточки и четырёх внешних оценок.
- AC10: детерминированные тесты FSRS для «Снова» и «Легко».
- AC12: seed → перезапуск API → verify на одной тестовой БД.
- AC13: проверка спецификации и интерфейса; таймеры, цели и напоминания отсутствуют.
- AC15: скриншоты Playwright на 320/390 px, обе темы, длинная фраза, оценки и ошибка; автоматическая проверка переполнения, позиции кнопок, контраста и клавиатурного фокуса.
- AC16–AC17: backend-тесты удалённых/недоступных карточек и подписанного Telegram initData.

## Внешняя ручная проверка

Ручной прогон в настоящем Telegram возможен только после появления настроенного бота и публичного HTTPS-адреса. До этого момента он считается **не проведённым**, а не пройденным. После развёртывания нужно проверить Main Mini App, обе темы, safe-area, системную кнопку Back и повторное открытие приложения.
