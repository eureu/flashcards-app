from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class Actor(BaseModel):
    user_id: UUID
    telegram_id: int
    display_name: str


class TelegramIdentity(BaseModel):
    telegram_id: int
    display_name: str
    auth_date: datetime
    start_param: str | None = None


class TelegramLoginRequest(BaseModel):
    init_data: str = Field(min_length=1)


class TelegramLoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int = 43_200
    user: Actor
    start_param: str | None = None
