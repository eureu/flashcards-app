from __future__ import annotations

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="", case_sensitive=False)

    app_env: str = "development"
    app_secret: str = Field(min_length=32)
    bot_token: str = Field(min_length=1)
    database_url: str
    static_dir: str | None = None


def load_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]
