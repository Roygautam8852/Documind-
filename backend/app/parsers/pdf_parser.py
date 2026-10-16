"""PDF parser using PyMuPDF (fitz).

Extracts text page-by-page, preserving page numbers.
Password-protected or corrupted PDFs raise MalformedFileError.
"""

from __future__ import annotations

import logging
from pathlib import Path

from app.core.exceptions import MalformedFileError
from app.parsers.base import BaseParser, ParsedDocument, ParsedPage

logger = logging.getLogger(__name__)


class PdfParser(BaseParser):
    """Parse PDF files using PyMuPDF."""

    mime_types = ("application/pdf",)
    extensions = ("pdf",)

    def parse(self, file_path: Path) -> ParsedDocument:
        """Extract text from every page of the PDF.

        Raises:
            MalformedFileError: If the file cannot be opened or is corrupted.
        """
        try:
            import fitz  # PyMuPDF — lazy import keeps cold-start fast
        except ImportError as exc:
            raise RuntimeError("PyMuPDF is not installed. Run: pip install pymupdf") from exc

        try:
            doc = fitz.open(str(file_path))
        except Exception as exc:
            logger.debug("PDF open failed for %s: %s", file_path.name, type(exc).__name__)
            raise MalformedFileError(
                message="The PDF file could not be read. It may be corrupted or password-protected."
            ) from exc

        pages: list[ParsedPage] = []
        try:
            for page_num in range(len(doc)):
                page = doc[page_num]
                text: str = page.get_text("text")  # type: ignore[attr-defined]
                # Normalise whitespace but preserve paragraph breaks
                text = _clean_text(text)
                pages.append(ParsedPage(page_number=page_num + 1, text=text))
        finally:
            doc.close()

        logger.debug(
            "PDF parsed: %d pages, %d chars total", len(pages), sum(p.char_count for p in pages)
        )
        return ParsedDocument(
            pages=pages,
            total_pages=len(pages),
            mime_type="application/pdf",
        )


def _clean_text(text: str) -> str:
    """Normalise extracted text without losing paragraph structure."""
    # Collapse runs of spaces/tabs on each line; preserve newlines
    lines = [" ".join(line.split()) for line in text.splitlines()]
    # Remove trailing blank lines but keep internal paragraph gaps
    return "\n".join(lines).strip()
