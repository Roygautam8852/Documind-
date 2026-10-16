"""Unit tests for RAG abstention evaluation."""

from __future__ import annotations

from app.providers.vector_store.base import VectorSearchResult
from app.rag.abstention import ABSTENTION_MESSAGE, create_abstention_response, should_abstain


def _make_result(score: float) -> VectorSearchResult:
    return VectorSearchResult(
        chunk_id="c-test",
        document_id="d-test",
        owner_id="u-test",
        text="Sample text",
        score=score,
        page_number=1,
        chunk_index=0,
    )


def test_should_abstain_when_empty() -> None:
    assert should_abstain([], similarity_threshold=0.35) is True


def test_should_abstain_when_scores_below_threshold() -> None:
    results = [_make_result(0.1), _make_result(0.25), _make_result(0.34)]
    assert should_abstain(results, similarity_threshold=0.35) is True


def test_should_not_abstain_when_score_meets_threshold() -> None:
    results = [_make_result(0.2), _make_result(0.35)]
    assert should_abstain(results, similarity_threshold=0.35) is False

    results_high = [_make_result(0.85)]
    assert should_abstain(results_high, similarity_threshold=0.35) is False


def test_create_abstention_response() -> None:
    resp = create_abstention_response(request_id="req-123")
    assert resp.answer == ABSTENTION_MESSAGE
    assert resp.citations == []
    assert resp.retrieval.result_count == 0
    assert resp.request_id == "req-123"
