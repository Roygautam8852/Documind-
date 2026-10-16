"""Unit tests for Reciprocal Rank Fusion (RRF)."""

from __future__ import annotations

from app.providers.vector_store.base import VectorSearchResult
from app.rag.fusion import reciprocal_rank_fusion


def _make_result(cid: str, text: str, score: float) -> VectorSearchResult:
    return VectorSearchResult(
        chunk_id=cid,
        document_id="doc1",
        owner_id="user1",
        text=text,
        score=score,
        page_number=1,
        chunk_index=0,
    )


def test_reciprocal_rank_fusion_merges_and_prioritizes_overlapping_items() -> None:
    dense = [
        _make_result("c1", "Candidate 1", 0.95),
        _make_result("c2", "Candidate 2", 0.85),
        _make_result("c3", "Candidate 3", 0.75),
    ]
    lexical = [
        _make_result("c2", "Candidate 2", 0.99),
        _make_result("c4", "Candidate 4", 0.80),
        _make_result("c1", "Candidate 1", 0.70),
    ]

    fused = reciprocal_rank_fusion(dense_results=dense, lexical_results=lexical, k=60, top_k=4)

    assert len(fused) == 4
    # c1 and c2 are in both lists, so they must have higher combined RRF scores than c3 and c4
    top_two_ids = {fused[0].chunk_id, fused[1].chunk_id}
    assert top_two_ids == {"c1", "c2"}

    # Scores must be within [0, 1]
    assert all(0.0 <= r.score <= 1.0 for r in fused)

    # Must be sorted descending by score
    scores = [r.score for r in fused]
    assert scores == sorted(scores, reverse=True)


def test_reciprocal_rank_fusion_empty_inputs() -> None:
    assert reciprocal_rank_fusion([], []) == []

    dense = [_make_result("c1", "Only Dense", 0.8)]
    fused = reciprocal_rank_fusion(dense, [])
    assert len(fused) == 1
    assert fused[0].chunk_id == "c1"

    lexical = [_make_result("c2", "Only Lexical", 0.7)]
    fused_lex = reciprocal_rank_fusion([], lexical)
    assert len(fused_lex) == 1
    assert fused_lex[0].chunk_id == "c2"
