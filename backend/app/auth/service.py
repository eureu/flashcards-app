from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.models import User
from app.auth.schemas import Actor, TelegramIdentity


def get_or_create_user(db: Session, identity: TelegramIdentity) -> User:
    user = db.scalar(select(User).where(User.telegram_id == identity.telegram_id))
    if user is None:
        user = User(telegram_id=identity.telegram_id, display_name=identity.display_name)
        db.add(user)
    else:
        user.display_name = identity.display_name
    db.commit()
    db.refresh(user)
    return user


def to_actor(user: User) -> Actor:
    return Actor(
        user_id=user.id,
        telegram_id=user.telegram_id,
        display_name=user.display_name,
    )
