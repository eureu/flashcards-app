from __future__ import annotations

import pytest

from app.deployment.telegram_menu import TelegramMenuStatus, configure_telegram_menu


def test_configures_and_verifies_default_web_app_menu() -> None:
    calls: list[tuple[str, dict | None]] = []

    def request(method: str, payload: dict | None = None) -> dict:
        calls.append((method, payload))
        if method == "getMe":
            return {"username": "studying_app_bot", "has_main_web_app": False}
        if method == "setChatMenuButton":
            return True
        if method == "getChatMenuButton":
            return {
                "type": "web_app",
                "text": "Открыть приложение",
                "web_app": {"url": "https://flashcards.eureu.space"},
            }
        raise AssertionError(method)

    status = configure_telegram_menu(
        bot_username="studying_app_bot",
        app_url="https://flashcards.eureu.space",
        request=request,
    )

    assert status == TelegramMenuStatus(
        bot_username="studying_app_bot",
        app_url="https://flashcards.eureu.space",
        main_web_app_enabled=False,
    )
    assert calls == [
        ("getMe", None),
        (
            "setChatMenuButton",
            {
                "menu_button": {
                    "type": "web_app",
                    "text": "Открыть приложение",
                    "web_app": {"url": "https://flashcards.eureu.space"},
                }
            },
        ),
        ("getChatMenuButton", None),
    ]


def test_rejects_wrong_bot_before_changing_menu() -> None:
    calls: list[str] = []

    def request(method: str, payload: dict | None = None) -> dict:
        calls.append(method)
        return {"username": "another_bot", "has_main_web_app": False}

    with pytest.raises(RuntimeError, match="BOT_USERNAME"):
        configure_telegram_menu(
            bot_username="studying_app_bot",
            app_url="https://flashcards.eureu.space",
            request=request,
        )

    assert calls == ["getMe"]


@pytest.mark.parametrize(
    "url",
    [
        "http://flashcards.eureu.space",
        "https://other.example",
        "https://flashcards.eureu.space/path",
    ],
)
def test_accepts_only_the_production_https_origin(url: str) -> None:
    with pytest.raises(ValueError, match="https://flashcards.eureu.space"):
        configure_telegram_menu(
            bot_username="studying_app_bot",
            app_url=url,
            request=lambda _method, _payload=None: {},
        )
