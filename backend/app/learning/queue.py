from __future__ import annotations

from datetime import datetime, timedelta
from uuid import UUID

from sqlalchemy import and_, or_, select
from sqlalchemy.orm import Session

from app.auth.schemas import Actor
from app.cards.models import Card
from app.clock import as_utc
from app.groups.service import require_membership
from app.learning.models import StudyState
from app.learning.schemas import LearningItem, LearningSummary

DIRECTIONS = ("en_ru", "ru_en")
EARLY_WINDOW = timedelta(minutes=20)


def _cards(db: Session, actor: Actor, group_id: UUID | None) -> list[Card]:
    personal = and_(Card.visibility == "personal", Card.author_id == actor.user_id)
    if group_id is None:
        access = personal
    else:
        require_membership(db, actor, group_id)
        access = or_(personal, and_(Card.visibility == "group", Card.group_id == group_id))
    return list(
        db.scalars(
            select(Card)
            .where(Card.deleted_at.is_(None), access)
            .order_by(Card.created_at, Card.id)
        ).all()
    )


def _data(db: Session, actor: Actor, group_id: UUID | None):
    cards = _cards(db, actor, group_id)
    card_ids = [card.id for card in cards]
    states = (
        db.scalars(
            select(StudyState).where(
                StudyState.user_id == actor.user_id, StudyState.card_id.in_(card_ids)
            )
        ).all()
        if card_ids
        else []
    )
    by_key = {(state.card_id, state.direction): state for state in states}
    return cards, by_key


def _item(card: Card, direction: str, state: StudyState | None) -> LearningItem:
    return LearningItem(
        card_id=card.id,
        direction=direction,  # type: ignore[arg-type]
        question=card.front if direction == "en_ru" else card.back,
        answer=card.back if direction == "en_ru" else card.front,
        content_version=card.version,
        state_version=state.version if state else 0,
    )


def get_next_item(
    db: Session,
    actor: Actor,
    group_id: UUID | None,
    last_card_id: UUID | None,
    now: datetime,
) -> LearningItem | None:
    cards, states = _data(db, actor, group_id)
    categories: list[list[tuple[Card, str, StudyState | None]]] = [[], [], [], []]
    for card in cards:
        for direction in DIRECTIONS:
            state = states.get((card.id, direction))
            candidate = (card, direction, state)
            if state is None:
                categories[2].append(candidate)
            elif as_utc(state.due_at) <= now:
                categories[0 if state.is_short else 1].append(candidate)
            elif state.is_short and as_utc(state.due_at) <= now + EARLY_WINDOW:
                categories[3].append(candidate)
    for candidates in categories:
        if not candidates:
            continue
        candidates.sort(
            key=lambda value: (
                as_utc(value[2].due_at) if value[2] else as_utc(value[0].created_at),
                str(value[0].id),
                value[1],
            )
        )
        chosen = next(
            (candidate for candidate in candidates if candidate[0].id != last_card_id),
            candidates[0],
        )
        return _item(*chosen)
    return None


def get_summary(
    db: Session, actor: Actor, group_id: UUID | None, now: datetime
) -> LearningSummary:
    cards, states = _data(db, actor, group_id)
    due_count = 0
    new_count = 0
    early = False
    for card in cards:
        for direction in DIRECTIONS:
            state = states.get((card.id, direction))
            if state is None:
                new_count += 1
            elif as_utc(state.due_at) <= now:
                due_count += 1
            elif state.is_short and as_utc(state.due_at) <= now + EARLY_WINDOW:
                early = True
    return LearningSummary(
        due_count=due_count,
        new_count=new_count,
        can_start=due_count > 0 or new_count > 0 or early,
    )
