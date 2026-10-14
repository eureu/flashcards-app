from __future__ import annotations

from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, Header, Response
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_actor
from app.auth.schemas import Actor
from app.clock import get_now
from app.db import get_session
from app.learning.queue import get_next_item, get_summary
from app.learning.schemas import LearningItem, LearningSummary, ReviewCommand, ReviewOutcome
from app.learning.service import submit_review

router = APIRouter(prefix="/api/learning")


@router.get("/summary", response_model=LearningSummary)
def learning_summary(
    group_id: UUID | None = None,
    actor: Actor = Depends(get_current_actor),
    db: Session = Depends(get_session),
    now: datetime = Depends(get_now),
) -> LearningSummary:
    return get_summary(db, actor, group_id, now)


@router.get("/next", response_model=LearningItem | None)
def learning_next(
    group_id: UUID | None = None,
    last_card_id: UUID | None = None,
    actor: Actor = Depends(get_current_actor),
    db: Session = Depends(get_session),
    now: datetime = Depends(get_now),
):
    item = get_next_item(db, actor, group_id, last_card_id, now)
    return item if item is not None else Response(status_code=204)


@router.post("/reviews", response_model=ReviewOutcome)
def learning_review(
    payload: ReviewCommand,
    idempotency_key: UUID = Header(alias="Idempotency-Key"),
    actor: Actor = Depends(get_current_actor),
    db: Session = Depends(get_session),
    now: datetime = Depends(get_now),
) -> ReviewOutcome:
    return submit_review(db, actor, payload, idempotency_key, now)
