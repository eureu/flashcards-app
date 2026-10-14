from __future__ import annotations

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict

Direction = Literal["en_ru", "ru_en"]
Rating = Literal[1, 2, 3, 4]


class LearningItem(BaseModel):
    card_id: UUID
    direction: Direction
    question: str
    answer: str
    content_version: int
    state_version: int


class ReviewCommand(BaseModel):
    model_config = ConfigDict(extra="forbid")

    card_id: UUID
    direction: Direction
    rating: Rating
    group_id: UUID | None = None
    expected_content_version: int
    expected_state_version: int


class ReviewOutcome(BaseModel):
    event_id: UUID
    state_version: int
    due_at: datetime


class LearningSummary(BaseModel):
    due_count: int
    new_count: int
    can_start: bool
