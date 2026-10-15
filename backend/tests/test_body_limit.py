from fastapi import FastAPI, Request
from fastapi.testclient import TestClient

from app.body_limit import RequestBodyLimitMiddleware


def test_chunked_body_is_limited_without_content_length() -> None:
    app = FastAPI()
    app.add_middleware(RequestBodyLimitMiddleware, max_bytes=5)

    @app.post("/consume")
    async def consume(request: Request) -> dict[str, int]:
        return {"size": len(await request.body())}

    with TestClient(app) as client:
        response = client.post("/consume", content=(part for part in [b"123", b"456"]))

    assert response.status_code == 413
    assert response.json()["error"]["code"] == "BODY_TOO_LARGE"
