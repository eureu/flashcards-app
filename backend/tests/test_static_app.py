from pathlib import Path

from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app


def test_production_app_serves_built_spa_and_preserves_api_404(tmp_path: Path):
    (tmp_path / "assets").mkdir()
    (tmp_path / "index.html").write_text("<main>Language Cards</main>", encoding="utf-8")
    (tmp_path / "assets" / "app.js").write_text("window.loaded = true", encoding="utf-8")
    settings = Settings(
        app_env="production",
        app_secret="production-test-secret-with-at-least-32-characters",
        bot_token="123456:test-bot-token",
        database_url="sqlite+pysqlite:///:memory:",
        static_dir=str(tmp_path),
    )

    with TestClient(create_app(settings)) as client:
        assert client.get("/").text == "<main>Language Cards</main>"
        assert client.get("/groups/anything").text == "<main>Language Cards</main>"
        assert client.get("/assets/app.js").text == "window.loaded = true"
        response = client.get("/api/not-a-route")

    assert response.status_code == 404
    assert response.json() == {"detail": "Not Found"}
