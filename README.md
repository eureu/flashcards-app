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
