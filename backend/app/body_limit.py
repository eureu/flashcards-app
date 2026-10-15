from __future__ import annotations

from collections.abc import Awaitable, Callable
from typing import Any

from starlette.responses import JSONResponse

ASGIApp = Callable[[dict[str, Any], Callable[[], Awaitable[dict[str, Any]]], Callable[[dict[str, Any]], Awaitable[None]]], Awaitable[None]]


class _BodyTooLarge(Exception):
    pass


class RequestBodyLimitMiddleware:
    def __init__(self, app: ASGIApp, max_bytes: int = 32 * 1024 * 1024) -> None:
        self.app = app
        self.max_bytes = max_bytes

    async def __call__(self, scope: dict[str, Any], receive, send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        headers = {key.lower(): value for key, value in scope.get("headers", [])}
        raw_length = headers.get(b"content-length")
        if raw_length is not None:
            try:
                content_length = int(raw_length)
            except ValueError:
                await self._error(send, 400, "INVALID_CONTENT_LENGTH", "Некорректный Content-Length")
                return
            if content_length > self.max_bytes:
                await self._error(send, 413, "BODY_TOO_LARGE", "Тело запроса слишком велико")
                return

        received = 0

        async def limited_receive():
            nonlocal received
            message = await receive()
            if message["type"] == "http.request":
                received += len(message.get("body", b""))
                if received > self.max_bytes:
                    raise _BodyTooLarge
            return message

        try:
            await self.app(scope, limited_receive, send)
        except _BodyTooLarge:
            await self._error(send, 413, "BODY_TOO_LARGE", "Тело запроса слишком велико")

    @staticmethod
    async def _error(send, status: int, code: str, message: str) -> None:
        response = JSONResponse(
            status_code=status,
            content={"error": {"code": code, "message": message, "details": {}}},
        )
        await response({"type": "http"}, receive=lambda: None, send=send)
