"""Unit tests for the text chunking service."""

from __future__ import annotations

from unittest.mock import MagicMock, patch

from app.services.chunking_service import chunk_document_pages, count_tokens


def _mock_settings(chunk_size: int = 200, chunk_overlap: int = 40) -> MagicMock:
    m = MagicMock()
    m.chunk_size = chunk_size
    m.chunk_overlap = chunk_overlap
    return m


def test_chunk_single_short_page() -> None:
    """A short page produces exactly one chunk."""
    with patch("app.services.chunking_service.get_settings", return_value=_mock_settings()):
        pages = [(1, "Short text. Easy.")]
        chunks = chunk_document_pages(pages)
    assert len(chunks) == 1
    assert chunks[0].page_number == 1
    assert chunks[0].chunk_index == 0
    assert chunks[0].token_count is not None
    assert chunks[0].token_count > 0


def test_chunk_long_text_produces_multiple_chunks() -> None:
    """Text longer than chunk_size must be split into multiple chunks."""
    text = " ".join(f"This is sentence number {i}." for i in range(30))
    with patch(
        "app.services.chunking_service.get_settings",
        return_value=_mock_settings(chunk_size=200, chunk_overlap=40),
    ):
        chunks = chunk_document_pages([(1, text)])
    assert len(chunks) > 1
    for chunk in chunks:
        assert chunk.token_count is not None
        assert chunk.token_count > 0


def test_chunks_are_indexed_sequentially() -> None:
    long_text = "Word " * 500
    with patch(
        "app.services.chunking_service.get_settings", return_value=_mock_settings(chunk_size=100)
    ):
        chunks = chunk_document_pages([(1, long_text)])
    indices = [c.chunk_index for c in chunks]
    assert indices == list(range(len(chunks)))


def test_empty_pages_skipped() -> None:
    pages = [(1, ""), (2, "   "), (3, "Real content here.")]
    with patch("app.services.chunking_service.get_settings", return_value=_mock_settings()):
        chunks = chunk_document_pages(pages)
    assert all(c.text.strip() for c in chunks)


def test_multi_page_chunks_retain_page_numbers() -> None:
    pages = [(1, "Page one content. Some text here."), (2, "Page two content. More text.")]
    with patch(
        "app.services.chunking_service.get_settings", return_value=_mock_settings(chunk_size=50)
    ):
        chunks = chunk_document_pages(pages)
    page_numbers = {c.page_number for c in chunks}
    assert 1 in page_numbers
    assert 2 in page_numbers


def test_no_chunk_exceeds_size_threshold() -> None:
    """Chunks may slightly exceed chunk_size at sentence boundaries, but not by >2x."""
    text = "Short sentence. " * 100
    chunk_size = 150
    with patch(
        "app.services.chunking_service.get_settings",
        return_value=_mock_settings(chunk_size=chunk_size),
    ):
        chunks = chunk_document_pages([(1, text)])
    for chunk in chunks:
        assert len(chunk.text) < chunk_size * 2, f"Chunk too large: {len(chunk.text)} chars"


def test_paragraph_boundaries_preferred() -> None:
    """Paragraphs should be preserved intact when they fit within the chunk size."""
    p1 = "Paragraph 1 is about introduction and overview of the DocuMind system."
    p2 = "Paragraph 2 delves into specific architecture and vector database indexing details."
    text = f"{p1}\n\n{p2}"

    with patch(
        "app.services.chunking_service.get_settings",
        return_value=_mock_settings(chunk_size=max(len(p1), len(p2)) + 10, chunk_overlap=0),
    ):
        chunks = chunk_document_pages([(1, text)])

    assert len(chunks) == 2
    assert chunks[0].text == p1
    assert chunks[1].text == p2


def test_no_duplicate_or_empty_chunks() -> None:
    """Duplicate paragraphs and empty blocks should be omitted."""
    repeated_para = "This is a repeated paragraph in the document."
    text = f"{repeated_para}\n\n\n\n{repeated_para}\n\n   \n\nA unique paragraph."

    with patch(
        "app.services.chunking_service.get_settings",
        return_value=_mock_settings(chunk_size=100, chunk_overlap=0),
    ):
        chunks = chunk_document_pages([(1, text)])

    texts = [c.text for c in chunks]
    assert len(texts) == len(set(texts)), "All produced chunks must have unique texts"
    assert all(t.strip() for t in texts), "No empty chunks should be produced"


def test_chunking_by_tokens() -> None:
    """Chunking with by_tokens=True measures chunk sizes using token counts."""
    sentences = [
        f"DocuMind section {i} simplifies document indexing and vector search retrieval."
        for i in range(12)
    ]
    text = " ".join(sentences)

    # With by_tokens=True, chunk_size=25 tokens
    chunks = chunk_document_pages([(1, text)], chunk_size=25, chunk_overlap=5, by_tokens=True)
    assert len(chunks) > 1
    for chunk in chunks:
        assert chunk.token_count is not None
        assert chunk.token_count <= 40  # Well within bounds given boundary preservation


def test_count_tokens_utility() -> None:
    """Test token estimation utility."""
    assert count_tokens("") == 0
    assert count_tokens("   ") == 0
    assert count_tokens("Hello world") >= 2
    assert count_tokens("DocuMind is an intelligent document management system.") > 5
