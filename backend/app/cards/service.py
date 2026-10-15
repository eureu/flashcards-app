from __future__ import annotations

from datetime import datetime
from uuid import UUID

from sqlalchemy import and_, or_, select
from sqlalchemy.orm import Session

from app.auth.schemas import Actor
from app.cards.models import Card
from app.cards.policy import require_create_access, require_delete_access, require_edit_access
from app.cards.schemas import CardTarget, CardView, GroupTarget
from app.clock import utc_now
from app.errors import DomainError
from app.groups.models import Group
from app.groups.service import require_membership


def _card_or_404(db: Session, card_id: UUID, *, lock: bool = False) -> Card:
    statement = select(Card).where(Card.id == card_id, Card.deleted_at.is_(None))
    if lock:
        statement = statement.with_for_update()
    card = db.scalar(statement)
    if card is None:
        raise DomainError("NOT_FOUND", "Карточка не найдена", 404)
    return card


def _permissions(db: Session, actor: Actor, card: Card) -> tuple[bool, bool]:
    if card.visibility == "personal":
        own = card.author_id == actor.user_id
        return own, own
    assert card.group_id is not None
    group = db.get(Group, card.group_id)
    is_owner = group is not None and group.owner_id == actor.user_id
    return card.author_id == actor.user_id or is_owner, is_owner


def _view(db: Session, actor: Actor, card: Card) -> CardView:
    can_edit, can_delete = _permissions(db, actor, card)
    return CardView(
        id=card.id,
        front=card.front,
        back=card.back,
        visibility=card.visibility,  # type: ignore[arg-type]
        group_id=card.group_id,
        version=card.version,
        can_edit=can_edit,
        can_delete=can_delete,
    )


def create_card(
    db: Session, actor: Actor, target: CardTarget, front: str, back: str
) -> CardView:
    require_create_access(db, actor, target)
    group_id = target.group_id if isinstance(target, GroupTarget) else None
    card = Card(
        front=front,
        back=back,
        visibility=target.visibility,
        group_id=group_id,
        author_id=actor.user_id,
        version=1,
    )
    db.add(card)
    db.commit()
    db.refresh(card)
    return _view(db, actor, card)


def get_card(db: Session, actor: Actor, card_id: UUID) -> CardView:
    card = _card_or_404(db, card_id)
    if card.visibility == "personal":
        if card.author_id != actor.user_id:
            raise DomainError("NOT_FOUND", "Карточка не найдена", 404)
    else:
        assert card.group_id is not None
        require_membership(db, actor, card.group_id)
    return _view(db, actor, card)


def update_card(
    db: Session,
    actor: Actor,
    card_id: UUID,
    front: str,
    back: str,
    expected_version: int,
) -> CardView:
    card = _card_or_404(db, card_id, lock=True)
    require_edit_access(db, actor, card)
    if card.version != expected_version:
        raise DomainError(
            "VERSION_CONFLICT",
            "Карточка уже была изменена",
            409,
            {"current_version": card.version},
        )
    card.front = front
    card.back = back
    card.version += 1
    db.commit()
    db.refresh(card)
    return _view(db, actor, card)


def delete_card(
    db: Session,
    actor: Actor,
    card_id: UUID,
    expected_version: int,
    now: datetime | None = None,
) -> None:
    card = _card_or_404(db, card_id, lock=True)
    require_delete_access(db, actor, card)
    if card.version != expected_version:
        raise DomainError(
            "VERSION_CONFLICT",
            "Карточка уже была изменена",
            409,
            {"current_version": card.version},
        )
    card.deleted_at = now or utc_now()
    card.version += 1
    db.commit()


def list_cards(
    db: Session,
    actor: Actor,
    group_id: UUID | None,
    card_filter: str,
    query: str | None,
    offset: int,
    limit: int,
) -> list[CardView]:
    if group_id is not None:
        require_membership(db, actor, group_id)

    personal = and_(Card.visibility == "personal", Card.author_id == actor.user_id)
    shared = and_(Card.visibility == "group", Card.group_id == group_id)
    if card_filter == "personal" or group_id is None:
        access = personal
    elif card_filter == "shared":
        access = shared
    else:
        access = or_(personal, shared)

    statement = select(Card).where(Card.deleted_at.is_(None), access)
    if query:
        clean_query = query.strip()
        if clean_query:
            statement = statement.where(
                or_(
                    Card.front.icontains(clean_query, autoescape=True),
                    Card.back.icontains(clean_query, autoescape=True),
                )
            )
    cards = db.scalars(statement.order_by(Card.created_at, Card.id).offset(offset).limit(limit)).all()
    return [_view(db, actor, card) for card in cards]
