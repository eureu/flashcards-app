from __future__ import annotations

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.schemas import Actor
from app.errors import DomainError
from app.operations.models import OperationReceipt


def get_operation_result(
    db: Session, actor: Actor, kind: str, key: UUID, request_hash: str
) -> dict | None:
    receipt = db.scalar(
        select(OperationReceipt).where(
            OperationReceipt.user_id == actor.user_id,
            OperationReceipt.kind == kind,
            OperationReceipt.key == key,
        )
    )
    if receipt is None:
        return None
    if receipt.request_hash != request_hash:
        raise DomainError(
            "IDEMPOTENCY_CONFLICT",
            "Этот ключ уже использован для другого запроса",
            409,
        )
    return receipt.response


def save_operation_result(
    db: Session,
    actor: Actor,
    kind: str,
    key: UUID,
    request_hash: str,
    response: dict,
) -> None:
    db.add(
        OperationReceipt(
            user_id=actor.user_id,
            kind=kind,
            key=key,
            request_hash=request_hash,
            response=response,
        )
    )
