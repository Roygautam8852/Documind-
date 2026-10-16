"""Unit tests for citation extraction and server-side validation."""

from __future__ import annotations

from app.providers.vector_store.base import VectorSearchResult
from app.rag.citation_service import CitationService


def test_extract_citation_tags() -> None:
    text = "Based on [S1], we can deduce that [S2] applies. Also see [S1] and [S3]."
    tags = CitationService.extract_citation_tags(text)
    assert tags == ["S1", "S2", "S3"]


def test_extract_citation_tags_empty() -> None:
    assert CitationService.extract_citation_tags("No citations in this text.") == []


def test_validate_citations_success() -> None:
    chunk1 = VectorSearchResult(
        chunk_id="chk-1",
        document_id="doc-1",
        owner_id="user-1",
        text="First passage content.",
        score=0.9,
        page_number=5,
        chunk_index=0,
    )
    chunk2 = VectorSearchResult(
        chunk_id="chk-2",
        document_id="doc-2",
        owner_id="user-1",
        text="Second passage content.",
        score=0.8,
        page_number=10,
        chunk_index=2,
    )

    source_map = {
        "S1": (chunk1, "report.pdf"),
        "S2": (chunk2, "analysis.docx"),
    }

    answer = "The analysis indicates growth [S1], and reinforces previous findings [S2]."
    citations = CitationService.validate_citations(answer, source_map)

    assert len(citations) == 2
    c1, c2 = citations[0], citations[1]

    assert c1.citation_id == "S1"
    assert c1.document_id == "doc-1"
    assert c1.filename == "report.pdf"
    assert c1.page_number == 5
    assert c1.chunk_id == "chk-1"
    assert c1.snippet == "First passage content."

    assert c2.citation_id == "S2"
    assert c2.document_id == "doc-2"
    assert c2.filename == "analysis.docx"
    assert c2.page_number == 10
    assert c2.chunk_id == "chk-2"
    assert c2.snippet == "Second passage content."


def test_validate_citations_rejects_hallucinated_ids() -> None:
    """The LLM hallucinates [S99] and [S5] which were never provided in evidence."""
    chunk1 = VectorSearchResult(
        chunk_id="chk-1",
        document_id="doc-1",
        owner_id="user-1",
        text="Valid evidence content.",
        score=0.95,
        page_number=1,
        chunk_index=0,
    )
    source_map = {"S1": (chunk1, "valid.pdf")}

    # LLM hallucinates citations not in source_map
    answer = "According to [S1], reality is verified. However, [S99] and [S5] claim otherwise."
    citations = CitationService.validate_citations(answer, source_map)

    assert len(citations) == 1
    assert citations[0].citation_id == "S1"
    assert not any(c.citation_id in ("S99", "S5") for c in citations)
