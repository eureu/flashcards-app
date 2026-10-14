from __future__ import annotations

from typing import Annotated, Literal, Union
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, StringConstraints

CardText = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=2000)]


class PersonalTarget(BaseModel):
    model_config = ConfigDict(extra="forbid")
    visibility: Literal["personal"]


class GroupTarget(BaseModel):
    model_config = ConfigDict(extra="forbid")
    visibility: Literal["group"]
    group_id: UUID


CardTarget = Annotated[Union[PersonalTarget, GroupTarget], Field(discriminator="visibility")]


class CardCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    target: CardTarget
    front: CardText
    back: CardText


class CardUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    front: CardText
    back: CardText
    expected_version: int = Field(ge=1)


class CardDelete(BaseModel):
    model_config = ConfigDict(extra="forbid")
    expected_version: int = Field(ge=1)


class CardView(BaseModel):
    id: UUID
    front: str
    back: str
    visibility: Literal["personal", "group"]
    group_id: UUID | None
    version: int
    can_edit: bool
    can_delete: bool
