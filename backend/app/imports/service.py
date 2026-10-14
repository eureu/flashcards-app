from __future__ import annotations

import hashlib
import hmac
import json
from datetime import datetime, timedelta
from uuid import UUID

import jwt
from sqlalchemy import and_, select
from sqlalchemy.orm import Session

from app.auth.models import User
from app.auth.schemas import Actor
from app.cards.models import Card
from app.cards.policy import require_create_access
from app.cards.schemas import CardTarget, GroupTarget
from app.errors import DomainError
from app.groups.models import Group
from app.imports.parser import MAX_ROWS, MAX_SIDE_LENGTH, SEPARATOR, fingerprint, parse_list
from app.imports.schemas import CommitResult, ImportPreview, ImportRow
from app.operations.service import get_operation_result, save_operation_result

PREVIEW_LIFETIME = timedelta(hours=1)
IMPORT_KIND = "card-import"


def _canonical_target(target: CardTarget) -> dict:
    return target.model_dump(mode="json")


def _canonical_rows(rows: list[ImportRow]) -> list[dict]:
    return [
        {
            "row_id": row.row_id,
            "original": row.original,
            "front": row.front,
            "back": row.back,
            "selected": row.selected,
            "keep_duplicate": row.keep_duplicate,
        }
        for row in rows
    ]


def _stable_hash(value: object) -> str:
    raw = json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(raw.encode()).hexdigest()


def _preview_key(secret: str) -> bytes:
    return hmac.new(secret.encode(), b"language-cards:import-preview", hashlib.sha256).digest()


def _existing_fingerprints(
    db: Session, actor: Actor, target: CardTarget
) -> set[str]:
    if isinstance(target, GroupTarget):
        condition = and_(Card.visibility == "group", Card.group_id == target.group_id)
    else:
        condition = and_(Card.visibility == "personal", Card.author_id == actor.user_id)
    cards = db.execute(
        select(Card.front, Card.back).where(Card.deleted_at.is_(None), condition)
    ).all()
    return {fingerprint(front, back) for front, back in cards}


def _normalize_rows(rows: list[ImportRow], existing: set[str]) -> list[ImportRow]:
    if len(rows) > MAX_ROWS:
        raise DomainError("TOO_MANY_ROWS", "За один раз можно добавить не более 500 строк", 422)
    seen = set(existing)
    normalized: list[ImportRow] = []
    for source in rows:
        row = source.model_copy(deep=True)
        row.front = row.front.strip() if row.front is not None else None
        row.back = row.back.strip() if row.back is not None else None
        row.error = None
        if not row.front or not row.back:
            row.error = (
                "Не найден разделитель « - »"
                if SEPARATOR.search(row.original) is None
                else "Обе стороны карточки должны быть заполнены"
            )
        elif len(row.front) > MAX_SIDE_LENGTH or len(row.back) > MAX_SIDE_LENGTH:
            row.error = "Каждая сторона должна быть не длиннее 2000 символов"
        row.duplicate = False
        if row.front and row.back:
            value = fingerprint(row.front, row.back)
            row.duplicate = value in seen
            seen.add(value)
        if row.duplicate and not row.keep_duplicate:
            row.selected = False
        normalized.append(row)
    return normalized


def _duplicate_snapshot(rows: list[ImportRow]) -> dict[str, bool]:
    return {str(row.row_id): row.duplicate for row in rows}


def preview_import(
    db: Session,
    actor: Actor,
    target: CardTarget,
    text: str | None,
    supplied_rows: list[ImportRow] | None,
    secret: str,
    now: datetime,
) -> ImportPreview:
    require_create_access(db, actor, target)
    rows = parse_list(text) if text is not None else list(supplied_rows or [])
    rows = _normalize_rows(rows, _existing_fingerprints(db, actor, target))
    selected = [row for row in rows if row.selected]
    errors = [row for row in selected if row.error is not None]
    chosen = [
        row
        for row in selected
        if row.error is None and (not row.duplicate or row.keep_duplicate)
    ]
    token = None
    if chosen and not errors:
        token = jwt.encode(
            {
                "sub": str(actor.user_id),
                "iss": "language-cards",
                "aud": "import-preview",
                "iat": int(now.timestamp()),
                "exp": int((now + PREVIEW_LIFETIME).timestamp()),
                "rows_hash": _stable_hash(_canonical_rows(rows)),
                "target_hash": _stable_hash(_canonical_target(target)),
                "duplicates": _duplicate_snapshot(rows),
            },
            _preview_key(secret),
            algorithm="HS256",
        )
    return ImportPreview(
        rows=rows,
        selected_count=len(chosen),
        error_count=len(errors),
        confirmation_token=token,
    )


def _decode_confirmation(token: str, secret: str, now: datetime) -> dict:
    try:
        payload = jwt.decode(
            token,
            _preview_key(secret),
            algorithms=["HS256"],
            audience="import-preview",
            issuer="language-cards",
            options={"verify_exp": False, "verify_iat": False},
        )
        if float(payload["exp"]) <= now.timestamp() or float(payload["iat"]) > now.timestamp():
            raise jwt.InvalidTokenError()
        return payload
    except (jwt.PyJWTError, KeyError, TypeError, ValueError):
        raise DomainError("INVALID_CONFIRMATION", "Предпросмотр устарел или недействителен", 409) from None


def _lock_target(db: Session, actor: Actor, target: CardTarget) -> None:
    if isinstance(target, GroupTarget):
        db.scalar(select(Group).where(Group.id == target.group_id).with_for_update())
    else:
        db.scalar(select(User).where(User.id == actor.user_id).with_for_update())


def commit_import(
    db: Session,
    actor: Actor,
    target: CardTarget,
    rows: list[ImportRow],
    confirmation_token: str,
    key: UUID,
    secret: str,
    now: datetime,
) -> CommitResult:
    require_create_access(db, actor, target)
    _lock_target(db, actor, target)
    request_hash = _stable_hash(
        {"target": _canonical_target(target), "rows": _canonical_rows(rows)}
    )
    previous = get_operation_result(db, actor, IMPORT_KIND, key, request_hash)
    if previous is not None:
        return CommitResult.model_validate(previous)

    payload = _decode_confirmation(confirmation_token, secret, now)
    if payload.get("sub") != str(actor.user_id):
        raise DomainError("INVALID_CONFIRMATION", "Подтверждение выдано другому пользователю", 409)
    if payload.get("rows_hash") != _stable_hash(_canonical_rows(rows)):
        raise DomainError("IMPORT_CHANGED", "Строки изменились после предпросмотра", 409)
    if payload.get("target_hash") != _stable_hash(_canonical_target(target)):
        raise DomainError("IMPORT_CHANGED", "Место назначения изменилось", 409)

    current_rows = _normalize_rows(rows, _existing_fingerprints(db, actor, target))
    if payload.get("duplicates") != _duplicate_snapshot(current_rows):
        raise DomainError("DUPLICATES_CHANGED", "Список дубликатов изменился; повторите предпросмотр", 409)
    chosen = [
        row
        for row in current_rows
        if row.selected and row.error is None and (not row.duplicate or row.keep_duplicate)
    ]
    if not chosen or any(row.selected and row.error for row in current_rows):
        raise DomainError("INVALID_IMPORT", "Нет корректных выбранных строк", 409)

    group_id = target.group_id if isinstance(target, GroupTarget) else None
    created: list[Card] = []
    for row in chosen:
        card = Card(
            front=row.front,
            back=row.back,
            visibility=target.visibility,
            group_id=group_id,
            author_id=actor.user_id,
            version=1,
        )
        db.add(card)
        created.append(card)
    db.flush()
    result = CommitResult(
        created_ids=[str(card.id) for card in created], created_count=len(created)
    )
    save_operation_result(
        db, actor, IMPORT_KIND, key, request_hash, result.model_dump(mode="json")
    )
    db.commit()
    return result
