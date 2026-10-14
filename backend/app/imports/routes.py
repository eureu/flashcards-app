from __future__ import annotations

from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, Header, Request
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_actor
from app.auth.schemas import Actor
from app.clock import get_now
from app.db import get_session
from app.imports.schemas import CommitRequest, CommitResult, ImportPreview, PreviewRequest
from app.imports.service import commit_import, preview_import

router = APIRouter(prefix="/api/imports")


@router.post("/preview", response_model=ImportPreview)
def imports_preview(
    payload: PreviewRequest,
    request: Request,
    actor: Actor = Depends(get_current_actor),
    db: Session = Depends(get_session),
    now: datetime = Depends(get_now),
) -> ImportPreview:
    return preview_import(
        db,
        actor,
        payload.target,
        payload.text,
        payload.rows,
        request.app.state.settings.app_secret,
        now,
    )


@router.post("/commit", response_model=CommitResult)
def imports_commit(
    payload: CommitRequest,
    request: Request,
    idempotency_key: UUID = Header(alias="Idempotency-Key"),
    actor: Actor = Depends(get_current_actor),
    db: Session = Depends(get_session),
    now: datetime = Depends(get_now),
) -> CommitResult:
    return commit_import(
        db,
        actor,
        payload.target,
        payload.rows,
        payload.confirmation_token,
        idempotency_key,
        request.app.state.settings.app_secret,
        now,
    )
