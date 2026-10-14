from __future__ import annotations

from uuid import UUID

from pydantic import BaseModel, Field


class GroupCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)


class MemberView(BaseModel):
    user_id: UUID
    display_name: str


class GroupView(BaseModel):
    id: UUID
    name: str
    owner_id: UUID
    is_owner: bool
    can_add_shared: bool
    members: list[MemberView]


class InvitationCreated(BaseModel):
    token: str


class InvitationPreview(BaseModel):
    group_name: str
