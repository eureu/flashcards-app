import pytest

from app.errors import DomainError
from app.imports.parser import fingerprint, parse_list


def test_phrase_slashes_and_nbsp_are_preserved():
    rows = parse_list("Receive - получать/принимать\u00a0\n\nHigh priest — первосвященник")
    assert [(row.front, row.back) for row in rows] == [
        ("Receive", "получать/принимать"),
        ("High priest", "первосвященник"),
    ]


def test_unstructured_line_remains_visible():
    source = 'Выражение it depends означает "в зависимости от обстоятельств"'
    row = parse_list(source)[0]
    assert row.original == source
    assert row.error is not None
    assert row.selected is True


def test_crlf_internal_hyphen_and_explanation_are_preserved():
    rows = parse_list("mother-in-law - тёща\r\nCell - клетка (в теле, в тюрьме/ячейка)")
    assert rows[0].front == "mother-in-law"
    assert rows[1].back == "клетка (в теле, в тюрьме/ячейка)"


def test_fingerprint_uses_nfc_casefold_and_collapsed_spaces():
    assert fingerprint("  CAFÉ ", " a   b ") == fingerprint("cafe\u0301", "A B")
    assert fingerprint("Provision", "обеспечение") != fingerprint("Provision", "провизия")


def test_empty_side_and_too_long_side_are_visible_errors():
    empty, long = parse_list(f" - перевод\n{'x' * 2001} - перевод")
    assert empty.error is not None
    assert long.error is not None


def test_more_than_500_nonempty_lines_is_rejected():
    with pytest.raises(DomainError) as error:
        parse_list("\n".join(f"word {index} - перевод" for index in range(501)))
    assert error.value.status == 422
