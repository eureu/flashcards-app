from __future__ import annotations

import json
import os
import sys
from collections.abc import Callable
from dataclasses import asdict, dataclass
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

PRODUCTION_URL = "https://flashcards.eureu.space"
BotApiRequest = Callable[[str, dict[str, Any] | None], dict[str, Any]]


@dataclass(frozen=True)
class TelegramMenuStatus:
    bot_username: str
    app_url: str
    main_web_app_enabled: bool


def make_bot_api_request(bot_token: str) -> BotApiRequest:
    if not bot_token:
        raise ValueError("BOT_TOKEN не задан")

    def call(method: str, payload: dict[str, Any] | None = None) -> dict[str, Any]:
        body = json.dumps(payload or {}).encode()
        request = Request(
            f"https://api.telegram.org/bot{bot_token}/{method}",
            data=body,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        try:
            with urlopen(request, timeout=15) as response:
                result = json.load(response)
        except HTTPError as error:
            try:
                description = json.loads(error.read()).get("description", "HTTP error")
            except (json.JSONDecodeError, AttributeError):
                description = "HTTP error"
            raise RuntimeError(f"Telegram Bot API: {description}") from None
        except URLError as error:
            raise RuntimeError(f"Telegram Bot API недоступен: {error.reason}") from None
        if not result.get("ok"):
            raise RuntimeError(f"Telegram Bot API: {result.get('description', 'неизвестная ошибка')}")
        return result.get("result")

    return call


def configure_telegram_menu(
    *,
    bot_username: str,
    app_url: str,
    request: BotApiRequest,
) -> TelegramMenuStatus:
    normalized_username = bot_username.strip().lstrip("@")
    if app_url != PRODUCTION_URL:
        raise ValueError(f"APP_PUBLIC_URL должен быть равен {PRODUCTION_URL}")

    bot = request("getMe", None)
    actual_username = str(bot.get("username", ""))
    if actual_username.casefold() != normalized_username.casefold():
        raise RuntimeError(
            f"BOT_USERNAME не соответствует токену: ожидался @{normalized_username}, получен @{actual_username}"
        )

    menu_button = {
        "type": "web_app",
        "text": "Открыть приложение",
        "web_app": {"url": app_url},
    }
    request("setChatMenuButton", {"menu_button": menu_button})
    current_menu = request("getChatMenuButton", None)
    if current_menu != menu_button:
        raise RuntimeError("Telegram не подтвердил кнопку Mini App")

    return TelegramMenuStatus(
        bot_username=normalized_username,
        app_url=app_url,
        main_web_app_enabled=bool(bot.get("has_main_web_app", False)),
    )


def main() -> None:
    status = configure_telegram_menu(
        bot_username=os.environ.get("BOT_USERNAME", ""),
        app_url=os.environ.get("APP_PUBLIC_URL", ""),
        request=make_bot_api_request(os.environ.get("BOT_TOKEN", "")),
    )
    print(json.dumps(asdict(status), ensure_ascii=False))
    if not status.main_web_app_enabled:
        print(
            "В BotFather ещё нужно включить Main Mini App для кнопки запуска в профиле бота.",
            file=sys.stderr,
        )


if __name__ == "__main__":
    main()
