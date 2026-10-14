from __future__ import annotations

import hashlib
import re
import unicodedata

from app.errors import DomainError
from app.imports.schemas import ImportRow

SEPARATOR = re.compile(r"[\t \u00a0]+[-–—][\t \u00a0]+")
WHITESPACE = re.compile(r"\s+")
MAX_ROWS = 500
MAX_SIDE_LENGTH = 2000


def _normal(value: str) -> str:
    return WHITESPACE.sub(" ", unicodedata.normalize("NFC", value).strip()).casefold()


def fingerprint(front: str, back: str) -> str:
    return hashlib.sha256(f"{_normal(front)}\0{_normal(back)}".encode()).hexdigest()


def parse_list(text: str) -> list[ImportRow]:
    source_lines = [(index, line) for index, line in enumerate(text.splitlines(), start=1) if line.strip()]
    if len(source_lines) > MAX_ROWS:
        raise DomainError("TOO_MANY_ROWS", "За один раз можно добавить не более 500 строк", 422)

    rows: list[ImportRow] = []
    for row_id, original in source_lines:
        match = SEPARATOR.search(original)
        front = original[: match.start()].strip() if match else None
        back = original[match.end() :].strip() if match else None
        error: str | None = None
        if match is None:
            error = "Не найден разделитель « - »"
        elif not front or not back:
            error = "Обе стороны карточки должны быть заполнены"
        elif len(front) > MAX_SIDE_LENGTH or len(back) > MAX_SIDE_LENGTH:
            error = "Каждая сторона должна быть не длиннее 2000 символов"
        rows.append(
            ImportRow(
                row_id=row_id,
                original=original,
                front=front or None,
                back=back or None,
                error=error,
            )
        )
    return rows
