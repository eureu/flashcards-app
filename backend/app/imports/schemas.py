from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.cards.schemas import CardTarget


class ImportRow(BaseModel):
    model_config = ConfigDict(extra="forbid")

    row_id: int = Field(ge=1)
    original: str
    front: str | None = None
    back: str | None = None
    selected: bool = True
    keep_duplicate: bool = False
    error: str | None = None
    duplicate: bool = False


class PreviewRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    target: CardTarget
    text: str | None = None
    rows: list[ImportRow] | None = None

    @model_validator(mode="after")
    def exactly_one_source(self):
        if (self.text is None) == (self.rows is None):
            raise ValueError("Укажите ровно одно из полей text или rows")
        return self


class ImportPreview(BaseModel):
    rows: list[ImportRow]
    selected_count: int
    error_count: int
    confirmation_token: str | None


class CommitRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    target: CardTarget
    rows: list[ImportRow]
    confirmation_token: str


class CommitResult(BaseModel):
    created_ids: list[str]
    created_count: int
