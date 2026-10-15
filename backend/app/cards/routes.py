from __future__ import annotations

from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_actor
from app.auth.schemas import Actor
from app.cards.schemas import CardCreate, CardDelete, CardUpdate, CardView
from app.cards.service import create_card, delete_card, get_card, list_cards, update_card
from app.db import get_session

router = APIRouter(prefix="/api/cards")


@router.get("", response_model=list[CardView])
def cards_index(
    group_id: UUID | None = None,
    filter: Literal["all", "shared", "personal"] = "all",
    q: str | None = None,
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    actor: Actor = Depends(get_current_actor),
    db: Session = Depends(get_session),
) -> list[CardView]:
    return list_cards(db, actor, group_id, filter, q, offset, limit)


@router.post("", response_model=CardView, status_code=status.HTTP_201_CREATED)
def cards_create(
    payload: CardCreate,
    actor: Actor = Depends(get_current_actor),
    db: Session = Depends(get_session),
) -> CardView:
    return create_card(db, actor, payload.target, payload.front, payload.back)


@router.get("/{card_id}", response_model=CardView)
def cards_show(
    card_id: UUID,
    actor: Actor = Depends(get_current_actor),
    db: Session = Depends(get_session),
) -> CardView:
    return get_card(db, actor, card_id)


@router.patch("/{card_id}", response_model=CardView)
def cards_update(
    card_id: UUID,
    payload: CardUpdate,
    actor: Actor = Depends(get_current_actor),
    db: Session = Depends(get_session),
) -> CardView:
    return update_card(
        db, actor, card_id, payload.front, payload.back, payload.expected_version
    )


@router.delete("/{card_id}", status_code=status.HTTP_204_NO_CONTENT)
def cards_delete(
    card_id: UUID,
    payload: CardDelete,
    actor: Actor = Depends(get_current_actor),
    db: Session = Depends(get_session),
) -> Response:
    delete_card(db, actor, card_id, payload.expected_version)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
