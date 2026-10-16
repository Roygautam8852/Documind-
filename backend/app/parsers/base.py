"""Base types for document parsers."""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path


@dataclass
class ParsedPage:
    """A single page or logical section of a parsed document."""

    page_number: int
    text: str
    char_count: int = field(init=False)

    def __post_init__(self) -> None:
        self.char_count = len(self.text)


@dataclass
class ParsedDocument:
    """Aggregated result of parsing an entire document file."""

    pages: list[ParsedPage]
    total_pages: int
    total_chars: int = field(init=False)
    mime_type: str = ""

    def __post_init__(self) -> None:
        self.total_chars = sum(p.char_count for p in self.pages)

    @property
    def full_text(self) -> str:
        """Concatenate all page texts with a page separator."""
        return "\n\n".join(p.text for p in self.pages if p.text.strip())

    def is_empty(self) -> bool:
        return self.total_chars == 0


class BaseParser:
    """Abstract document parser interface.

    All parsers must implement ``parse``. They must NOT write to the database,
    log sensitive content, or raise unhandled exceptions — wrap errors in
    ``MalformedFileError`` instead.
    """

    mime_types: tuple[str, ...] = ()
    extensions: tuple[str, ...] = ()

    def parse(self, file_path: Path) -> ParsedDocument:
        """Parse the file at ``file_path`` and return a ``ParsedDocument``."""
        raise NotImplementedError
