from __future__ import annotations

import hashlib
import secrets
from uuid import UUID

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.auth.models import User
from app.auth.schemas import Actor
from app.errors import DomainError
from app.groups.models import Group, Invitation, Membership
from app.groups.policy import can_publish_shared
from app.groups.schemas import GroupView, MemberView


def require_membership(db: Session, actor: Actor, group_id: UUID) -> Membership:
    membership = db.scalar(
        select(Membership).where(
            Membership.group_id == group_id,
            Membership.user_id == actor.user_id,
        )
    )
    if membership is None:
        raise DomainError("FORBIDDEN", "Вы не состоите в этой группе", 403)
    return membership


def _group_or_404(db: Session, group_id: UUID) -> Group:
    group = db.get(Group, group_id)
    if group is None:
        raise DomainError("NOT_FOUND", "Группа не найдена", 404)
    return group


def _view(db: Session, actor: Actor, group: Group) -> GroupView:
    rows = db.execute(
        select(Membership.user_id, User.display_name)
        .join(User, User.id == Membership.user_id)
        .where(Membership.group_id == group.id)
        .order_by(Membership.joined_at, User.display_name)
    ).all()
    return GroupView(
        id=group.id,
        name=group.name,
        owner_id=group.owner_id,
        is_owner=group.owner_id == actor.user_id,
        can_add_shared=can_publish_shared(actor.telegram_id, True),
        members=[MemberView(user_id=user_id, display_name=name) for user_id, name in rows],
    )


def create_group(db: Session, actor: Actor, name: str) -> GroupView:
    clean_name = name.strip()
    if not 1 <= len(clean_name) <= 120:
        raise DomainError("INVALID_GROUP_NAME", "Название группы должно содержать от 1 до 120 символов", 422)
    group = Group(name=clean_name, owner_id=actor.user_id)
    db.add(group)
    db.flush()
    db.add(Membership(group_id=group.id, user_id=actor.user_id))
    db.commit()
    return _view(db, actor, group)


def list_groups(db: Session, actor: Actor) -> list[GroupView]:
    groups = db.scalars(
        select(Group)
        .join(Membership, Membership.group_id == Group.id)
        .where(Membership.user_id == actor.user_id)
        .order_by(Group.created_at, Group.name)
    ).all()
    return [_view(db, actor, group) for group in groups]


def get_group(db: Session, actor: Actor, group_id: UUID) -> GroupView:
    require_membership(db, actor, group_id)
    return _view(db, actor, _group_or_404(db, group_id))


def _token_hash(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def create_invitation(db: Session, actor: Actor, group_id: UUID) -> str:
    require_membership(db, actor, group_id)
    group = _group_or_404(db, group_id)
    if group.owner_id != actor.user_id:
        raise DomainError("FORBIDDEN", "Только создатель группы управляет приглашением", 403)

    token = secrets.token_urlsafe(32)
    db.execute(delete(Invitation).where(Invitation.group_id == group_id))
    db.add(Invitation(group_id=group_id, token_hash=_token_hash(token)))
    db.commit()
    return token


def invitation_group(db: Session, token: str) -> Group:
    invitation = db.scalar(select(Invitation).where(Invitation.token_hash == _token_hash(token)))
    if invitation is None:
        raise DomainError("INVITATION_NOT_FOUND", "Приглашение недействительно", 404)
    return _group_or_404(db, invitation.group_id)


def join_group(db: Session, actor: Actor, token: str) -> GroupView:
    group = invitation_group(db, token)
    membership = db.scalar(
        select(Membership).where(
            Membership.group_id == group.id,
            Membership.user_id == actor.user_id,
        )
    )
    if membership is None:
        db.add(Membership(group_id=group.id, user_id=actor.user_id))
        db.commit()
    return _view(db, actor, group)


def leave_group(db: Session, actor: Actor, group_id: UUID) -> None:
    membership = require_membership(db, actor, group_id)
    group = _group_or_404(db, group_id)
    if group.owner_id == actor.user_id:
        raise DomainError("OWNER_CANNOT_LEAVE", "Создатель не может покинуть свою группу", 409)
    db.delete(membership)
    db.commit()
