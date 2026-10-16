"""Text chunking utilities for DocuMind.

Splits parsed document text into overlapping, semantically coherent chunks
suitable for embedding and vector storage.

Features:
- Prefers semantic boundaries (paragraphs first, then sentences, then words).
- Configurable chunk size and overlap (by character or by token count).
- Calculates token count per chunk.
- Filters out empty chunks and deduplicates identical chunks.
- Preserves page numbers and character offsets (start_char, end_char).
- Sequential zero-based chunk indexing per document.
"""

from __future__ import annotations

import re
from dataclasses import dataclass

from app.core.config import get_settings


@dataclass
class TextChunk:
    """A single text chunk ready for embedding and persistence."""

    chunk_index: int
    text: str
    page_number: int | None
    start_char: int
    end_char: int
    token_count: int | None = None


_PARAGRAPH_SPLIT = re.compile(r"\n\s*\n+")
_SENTENCE_SPLIT = re.compile(r"(?<=[.!?])\s+")


def count_tokens(text: str) -> int:
    """Estimate the token count of a text string.

    Uses a whitespace heuristic (~1.33 tokens per word for English)
    with a floor of 1 for non-empty text and 0 for empty text.
    """
    stripped = text.strip()
    if not stripped:
        return 0
    words = stripped.split()
    if not words:
        return 0
    return max(1, int(len(words) * 1.33))


def _split_into_units(text: str, max_size: int, by_tokens: bool) -> list[str]:
    """Split text hierarchically: paragraphs -> sentences -> words."""
    measure = count_tokens if by_tokens else len

    paragraphs = [p.strip() for p in _PARAGRAPH_SPLIT.split(text) if p.strip()]
    if not paragraphs:
        return []

    units: list[str] = []
    for para in paragraphs:
        if measure(para) <= max_size:
            units.append(para)
        else:
            sentences = [s.strip() for s in _SENTENCE_SPLIT.split(para) if s.strip()]
            for sentence in sentences:
                if measure(sentence) <= max_size:
                    units.append(sentence)
                else:
                    # Very long sentence without punctuation: split into words
                    words = sentence.split()
                    cur_words: list[str] = []
                    for w in words:
                        cand = " ".join(cur_words + [w])
                        if measure(cand) > max_size and cur_words:
                            units.append(" ".join(cur_words))
                            cur_words = [w]
                        else:
                            cur_words.append(w)
                    if cur_words:
                        units.append(" ".join(cur_words))

    return units


def chunk_document_pages(
    pages: list[tuple[int, str]],
    chunk_size: int | None = None,
    chunk_overlap: int | None = None,
    by_tokens: bool = False,
) -> list[TextChunk]:
    """Split a list of (page_number, text) tuples into overlapping chunks.

    Args:
        pages: List of (page_number, text_content) tuples.
        chunk_size: Target size per chunk (tokens if by_tokens=True, chars otherwise).
        chunk_overlap: Overlap between adjacent chunks (tokens if by_tokens=True, chars otherwise).
        by_tokens: If True, chunk_size and chunk_overlap are measured in tokens.

    Returns:
        Ordered list of unique, non-empty TextChunk objects with sequential chunk_index.
    """
    settings = get_settings()
    size = chunk_size or settings.chunk_size
    overlap = chunk_overlap or settings.chunk_overlap

    measure = count_tokens if by_tokens else len
    chunks: list[TextChunk] = []
    seen_texts: set[str] = set()
    chunk_index = 0

    for page_number, page_text in pages:
        if not page_text or not page_text.strip():
            continue

        units = _split_into_units(page_text, max_size=size, by_tokens=by_tokens)
        if not units:
            continue

        current_units: list[str] = []
        search_cursor = 0

        for unit in units:
            candidate = " ".join(current_units + [unit]) if current_units else unit
            if measure(candidate) > size and current_units:
                chunk_text = " ".join(current_units).strip()
                if chunk_text and chunk_text not in seen_texts:
                    seen_texts.add(chunk_text)
                    start_char = page_text.find(current_units[0], search_cursor)
                    if start_char == -1:
                        start_char = search_cursor
                    end_char = start_char + len(chunk_text)
                    search_cursor = max(search_cursor, start_char + 1)

                    chunks.append(
                        TextChunk(
                            chunk_index=chunk_index,
                            text=chunk_text,
                            page_number=page_number,
                            start_char=start_char,
                            end_char=end_char,
                            token_count=count_tokens(chunk_text),
                        )
                    )
                    chunk_index += 1

                # Calculate overlap: retain tail units fitting within overlap budget
                overlap_units: list[str] = []
                if overlap > 0:
                    for u in reversed(current_units):
                        cand_overlap = " ".join([u] + overlap_units)
                        if measure(cand_overlap) <= overlap:
                            overlap_units.insert(0, u)
                        else:
                            break
                    # If no whole unit fits within overlap but overlap was requested,
                    # keep the last unit if it doesn't match the whole current chunk
                    if not overlap_units and len(current_units) > 1:
                        overlap_units = [current_units[-1]]

                current_units = overlap_units + [unit]
            else:
                current_units.append(unit)

        # Flush remaining units on this page
        if current_units:
            chunk_text = " ".join(current_units).strip()
            if chunk_text and chunk_text not in seen_texts:
                seen_texts.add(chunk_text)
                start_char = page_text.find(current_units[0], search_cursor)
                if start_char == -1:
                    start_char = search_cursor
                end_char = start_char + len(chunk_text)

                chunks.append(
                    TextChunk(
                        chunk_index=chunk_index,
                        text=chunk_text,
                        page_number=page_number,
                        start_char=start_char,
                        end_char=end_char,
                        token_count=count_tokens(chunk_text),
                    )
                )
                chunk_index += 1

    return chunks
