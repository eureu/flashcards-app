from __future__ import annotations

import hashlib
import json
from datetime import datetime, timedelta
from uuid import UUID, uuid4

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.models import User
from app.auth.schemas import Actor
from app.cards.models import Card
from app.clock import as_utc
from app.errors import DomainError
from app.groups.service import require_membership
from app.learning.models import ReviewEvent, StudyState
from app.learning.scheduler import schedule_review
from app.learning.schemas import ReviewCommand, ReviewOutcome
from app.operations.service import get_operation_result, save_operation_result

REVIEW_KIND = "learning-review"


def _request_hash(command: ReviewCommand) -> str:
    raw = json.dumps(command.model_dump(mode="json"), sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(raw.encode()).hexdigest()


def _accessible_card(
    db: Session, actor: Actor, card_id: UUID, group_id: UUID | None
) -> Card:
    if group_id is not None:
        require_membership(db, actor, group_id)
    card = db.scalar(select(Card).where(Card.id == card_id, Card.deleted_at.is_(None)))
    if card is None:
        raise DomainError("NOT_FOUND", "Карточка не найдена", 404)
    if card.visibility == "personal":
        if card.author_id != actor.user_id:
            raise DomainError("NOT_FOUND", "Карточка не найдена", 404)
    else:
        if group_id is None or card.group_id != group_id:
            raise DomainError("FORBIDDEN", "Карточка недоступна в выбранном наборе", 403)
        require_membership(db, actor, card.group_id)
    return card


def submit_review(
    db: Session,
    actor: Actor,
    command: ReviewCommand,
    key: UUID,
    now: datetime,
) -> ReviewOutcome:
    card = _accessible_card(db, actor, command.card_id, command.group_id)
    db.scalar(select(User).where(User.id == actor.user_id).with_for_update())
    request_hash = _request_hash(command)
    previous = get_operation_result(db, actor, REVIEW_KIND, key, request_hash)
    if previous is not None:
        return ReviewOutcome.model_validate(previous)

    if card.version != command.expected_content_version:
        raise DomainError("CONTENT_VERSION_CONFLICT", "Текст карточки изменился", 409)
    state = db.scalar(
        select(StudyState).where(
            StudyState.user_id == actor.user_id,
            StudyState.card_id == card.id,
            StudyState.direction == command.direction,
        )
    )
    current_version = state.version if state else 0
    if current_version != command.expected_state_version:
        raise DomainError("STATE_VERSION_CONFLICT", "Эта карточка уже оценена", 409)
    if state and as_utc(state.due_at) > now and (
        not state.is_short or as_utc(state.due_at) > now + timedelta(minutes=20)
    ):
        raise DomainError("NOT_DUE", "Карточка ещё не готова к повторению", 409)

    scheduled = schedule_review(state.state_json if state else None, command.rating, now)
    next_version = current_version + 1
    if state is None:
        state = StudyState(
            user_id=actor.user_id,
            card_id=card.id,
            direction=command.direction,
            state_json=scheduled.state_json,
            due_at=scheduled.due_at,
            is_short=scheduled.is_short,
            version=next_version,
        )
        db.add(state)
    else:
        state.state_json = scheduled.state_json
        state.due_at = scheduled.due_at
        state.is_short = scheduled.is_short
        state.version = next_version

    event = ReviewEvent(
        id=uuid4(),
        user_id=actor.user_id,
        card_id=card.id,
        direction=command.direction,
        rating=command.rating,
        reviewed_at=now,
        content_version=card.version,
        state_version=next_version,
    )
    db.add(event)
    result = ReviewOutcome(
        event_id=event.id, state_version=next_version, due_at=scheduled.due_at
    )
    save_operation_result(
        db, actor, REVIEW_KIND, key, request_hash, result.model_dump(mode="json")
    )
    db.commit()
    return result
