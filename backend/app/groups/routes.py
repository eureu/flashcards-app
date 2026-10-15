from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Request, Response, status
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_actor
from app.auth.schemas import Actor
from app.db import get_session
from app.groups.schemas import (
    GroupCreate,
    GroupView,
    InvitationCreated,
    InvitationPreview,
)
from app.groups.service import (
    create_group,
    create_invitation,
    get_group,
    invitation_group,
    join_group,
    leave_group,
    list_groups,
)

router = APIRouter(prefix="/api", dependencies=[Depends(get_current_actor)])


@router.get("/groups", response_model=list[GroupView])
def groups_index(
    actor: Actor = Depends(get_current_actor), db: Session = Depends(get_session)
) -> list[GroupView]:
    return list_groups(db, actor)


@router.post("/groups", response_model=GroupView, status_code=status.HTTP_201_CREATED)
def groups_create(
    payload: GroupCreate,
    actor: Actor = Depends(get_current_actor),
    db: Session = Depends(get_session),
) -> GroupView:
    return create_group(db, actor, payload.name)


@router.get("/groups/{group_id}", response_model=GroupView)
def groups_show(
    group_id: UUID,
    actor: Actor = Depends(get_current_actor),
    db: Session = Depends(get_session),
) -> GroupView:
    return get_group(db, actor, group_id)


@router.post("/groups/{group_id}/invitation", response_model=InvitationCreated)
def invitations_create(
    group_id: UUID,
    request: Request,
    actor: Actor = Depends(get_current_actor),
    db: Session = Depends(get_session),
) -> InvitationCreated:
    token = create_invitation(db, actor, group_id)
    bot_username = request.app.state.settings.bot_username.strip().lstrip("@")
    url = f"https://t.me/{bot_username}?startapp={token}" if bot_username else None
    return InvitationCreated(token=token, url=url)


@router.get("/invitations/{token}", response_model=InvitationPreview)
def invitations_show(
    token: str,
    _: Actor = Depends(get_current_actor),
    db: Session = Depends(get_session),
) -> InvitationPreview:
    return InvitationPreview(group_name=invitation_group(db, token).name)


@router.post("/invitations/{token}/join", response_model=GroupView)
def invitations_join(
    token: str,
    actor: Actor = Depends(get_current_actor),
    db: Session = Depends(get_session),
) -> GroupView:
    return join_group(db, actor, token)


@router.delete("/groups/{group_id}/membership", status_code=status.HTTP_204_NO_CONTENT)
def membership_delete(
    group_id: UUID,
    actor: Actor = Depends(get_current_actor),
    db: Session = Depends(get_session),
) -> Response:
    leave_group(db, actor, group_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
