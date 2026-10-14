from __future__ import annotations

from sqlalchemy.orm import Session

from app.auth.schemas import Actor
from app.cards.models import Card
from app.cards.schemas import CardTarget, GroupTarget
from app.errors import DomainError
from app.groups.models import Group
from app.groups.policy import can_publish_shared
from app.groups.service import require_membership


def require_create_access(db: Session, actor: Actor, target: CardTarget) -> None:
    if not isinstance(target, GroupTarget):
        return
    require_membership(db, actor, target.group_id)
    if not can_publish_shared(actor.telegram_id, True):
        raise DomainError("FORBIDDEN", "Только назначенный издатель добавляет общие карточки", 403)


def require_edit_access(db: Session, actor: Actor, card: Card) -> None:
    if card.visibility == "personal":
        if card.author_id != actor.user_id:
            raise DomainError("NOT_FOUND", "Карточка не найдена", 404)
        return

    assert card.group_id is not None
    require_membership(db, actor, card.group_id)
    group = db.get(Group, card.group_id)
    if group is None:
        raise DomainError("NOT_FOUND", "Группа не найдена", 404)
    if card.author_id != actor.user_id and group.owner_id != actor.user_id:
        raise DomainError("FORBIDDEN", "Недостаточно прав для изменения карточки", 403)


def require_delete_access(db: Session, actor: Actor, card: Card) -> None:
    if card.visibility == "personal":
        if card.author_id != actor.user_id:
            raise DomainError("NOT_FOUND", "Карточка не найдена", 404)
        return

    assert card.group_id is not None
    require_membership(db, actor, card.group_id)
    group = db.get(Group, card.group_id)
    if group is None:
        raise DomainError("NOT_FOUND", "Группа не найдена", 404)
    if group.owner_id != actor.user_id:
        raise DomainError("FORBIDDEN", "Только создатель группы удаляет общие карточки", 403)
