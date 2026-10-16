"""Plain-text parser.

Reads the file as UTF-8 (with latin-1 fallback) and splits into
logical pages by line count.
"""

from __future__ import annotations

import logging
from pathlib import Path

from app.core.exceptions import MalformedFileError
from app.parsers.base import BaseParser, ParsedDocument, ParsedPage

logger = logging.getLogger(__name__)

_LINES_PER_PAGE = 60  # Approximate lines per logical page


class TxtParser(BaseParser):
    """Parse plain-text files (.txt)."""

    mime_types = ("text/plain",)
    extensions = ("txt",)

    def parse(self, file_path: Path) -> ParsedDocument:
        """Read a text file and split into logical pages.

        Raises:
            MalformedFileError: If the file cannot be decoded.
        """
        try:
            text = _read_file(file_path)
        except FileNotFoundError as exc:
            raise MalformedFileError(
                message="The file could not be read. It may not exist."
            ) from exc
        except UnicodeDecodeError as exc:
            raise MalformedFileError(
                message="The text file could not be decoded. Ensure it is UTF-8 or Latin-1 encoded."
            ) from exc
        except OSError as exc:
            raise MalformedFileError(message="The file could not be read.") from exc

        lines = text.splitlines()
        pages: list[ParsedPage] = []
        for page_idx, start in enumerate(range(0, max(len(lines), 1), _LINES_PER_PAGE)):
            chunk_lines = lines[start : start + _LINES_PER_PAGE]
            pages.append(
                ParsedPage(
                    page_number=page_idx + 1,
                    text="\n".join(chunk_lines).strip(),
                )
            )

        if not pages:
            pages = [ParsedPage(page_number=1, text="")]

        logger.debug("TXT parsed: %d lines → %d pages", len(lines), len(pages))
        return ParsedDocument(
            pages=pages,
            total_pages=len(pages),
            mime_type="text/plain",
        )


def _read_file(file_path: Path) -> str:
    """Try UTF-8 first, fall back to Latin-1."""
    try:
        return file_path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        return file_path.read_text(encoding="latin-1")
