"""Unit tests for text parsers.

Tests run on in-memory content and temporary files — no database.
"""

from __future__ import annotations

from pathlib import Path

import pytest
from app.core.exceptions import MalformedFileError
from app.parsers.base import ParsedDocument
from app.parsers.docx_parser import DocxParser
from app.parsers.pdf_parser import PdfParser
from app.parsers.txt_parser import TxtParser

# ── TXT Parser ─────────────────────────────────────────────────────────────────


def test_txt_parser_basic(tmp_path: Path) -> None:
    f = tmp_path / "test.txt"
    f.write_text("Line one.\nLine two.\nLine three.", encoding="utf-8")
    parser = TxtParser()
    result = parser.parse(f)
    assert isinstance(result, ParsedDocument)
    assert result.total_pages >= 1
    assert "Line one" in result.full_text
    assert not result.is_empty()


def test_txt_parser_empty_file(tmp_path: Path) -> None:
    f = tmp_path / "empty.txt"
    f.write_text("", encoding="utf-8")
    parser = TxtParser()
    result = parser.parse(f)
    assert result.is_empty()


def test_txt_parser_latin1_fallback(tmp_path: Path) -> None:
    f = tmp_path / "latin.txt"
    # Write with latin-1 encoding (not valid UTF-8)
    f.write_bytes("Caf\xe9 au lait".encode("latin-1"))
    parser = TxtParser()
    result = parser.parse(f)
    assert not result.is_empty()
    assert "Caf" in result.full_text


def test_txt_parser_multi_page(tmp_path: Path) -> None:
    """Files with >60 lines should produce multiple logical pages."""
    f = tmp_path / "long.txt"
    f.write_text("\n".join(f"Line {i}" for i in range(200)), encoding="utf-8")
    parser = TxtParser()
    result = parser.parse(f)
    assert result.total_pages > 1


def test_txt_parser_nonexistent_file(tmp_path: Path) -> None:
    parser = TxtParser()
    with pytest.raises(MalformedFileError):
        parser.parse(tmp_path / "ghost.txt")


# ── DOCX Parser ────────────────────────────────────────────────────────────────


def _make_docx(tmp_path: Path, text: str = "Hello document world.") -> Path:
    """Create a minimal DOCX file and return its path."""
    try:
        from docx import Document as DocxDoc
    except ImportError:
        pytest.skip("python-docx not installed")
    f = tmp_path / "test.docx"
    d = DocxDoc()
    for line in text.splitlines():
        d.add_paragraph(line)
    d.save(str(f))
    return f


def test_docx_parser_basic(tmp_path: Path) -> None:
    f = _make_docx(tmp_path, "Hello DOCX world.\nSecond paragraph.")
    parser = DocxParser()
    result = parser.parse(f)
    assert isinstance(result, ParsedDocument)
    assert not result.is_empty()
    assert "Hello DOCX" in result.full_text


def test_docx_parser_empty(tmp_path: Path) -> None:
    f = _make_docx(tmp_path, "")
    parser = DocxParser()
    result = parser.parse(f)
    assert result.is_empty()


def test_docx_parser_corrupted(tmp_path: Path) -> None:
    f = tmp_path / "corrupt.docx"
    f.write_bytes(b"this is not a docx file at all")
    parser = DocxParser()
    with pytest.raises(MalformedFileError):
        parser.parse(f)


def test_docx_multi_page(tmp_path: Path) -> None:
    """Documents with >30 paragraphs should produce multiple pages."""
    text = "\n".join(f"Paragraph {i}: some content here." for i in range(100))
    f = _make_docx(tmp_path, text)
    parser = DocxParser()
    result = parser.parse(f)
    assert result.total_pages > 1


# ── PDF Parser ─────────────────────────────────────────────────────────────────


def _minimal_pdf() -> bytes:
    """Return minimal valid PDF bytes with text content."""
    return (
        b"%PDF-1.4\n"
        b"1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n"
        b"2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n"
        b"3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R"
        b"/Resources<</Font<</F1 4 0 R>>>>"
        b"/Contents 5 0 R>>endobj\n"
        b"4 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\n"
        b"5 0 obj<</Length 44>>\nstream\nBT /F1 12 Tf 100 700 Td (Hello) Tj ET\nendstream\nendobj\n"
        b"xref\n0 6\n0000000000 65535 f\n"
        b"0000000009 00000 n\n0000000058 00000 n\n"
        b"0000000115 00000 n\n0000000266 00000 n\n0000000340 00000 n\n"
        b"trailer<</Size 6/Root 1 0 R>>\nstartxref\n406\n%%EOF"
    )


def test_pdf_parser_basic(tmp_path: Path) -> None:
    f = tmp_path / "test.pdf"
    f.write_bytes(_minimal_pdf())
    parser = PdfParser()
    result = parser.parse(f)
    assert isinstance(result, ParsedDocument)
    assert result.total_pages >= 1


def test_pdf_parser_corrupted(tmp_path: Path) -> None:
    f = tmp_path / "bad.pdf"
    f.write_bytes(b"not a pdf at all")
    parser = PdfParser()
    with pytest.raises(MalformedFileError):
        parser.parse(f)


def test_pdf_parser_nonexistent(tmp_path: Path) -> None:
    parser = PdfParser()
    with pytest.raises(MalformedFileError):
        parser.parse(tmp_path / "missing.pdf")
