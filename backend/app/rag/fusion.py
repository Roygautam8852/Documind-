"""Reciprocal Rank Fusion (RRF) for merging dense vector and sparse lexical results."""

from __future__ import annotations

from collections.abc import Sequence

from app.providers.vector_store.base import VectorSearchResult


def reciprocal_rank_fusion(
    dense_results: Sequence[VectorSearchResult],
    lexical_results: Sequence[VectorSearchResult],
    k: int = 60,
    top_k: int = 5,
) -> list[VectorSearchResult]:
    """Fuse dense vector and sparse lexical search rankings via Reciprocal Rank Fusion.

    Formula:
        RRF_score(d) = sum(1 / (k + rank_i(d))) for each ranked list.

    Args:
        dense_results: Results from vector embedding similarity search.
        lexical_results: Results from BM25 lexical keyword search.
        k: Smoothing constant preventing high ranks from dominating (standard: 60).
        top_k: Number of combined results to return.

    Returns:
        Ranked list of fused VectorSearchResult objects sorted by combined score.
    """
    if not dense_results and not lexical_results:
        return []

    # Map chunk_id to (VectorSearchResult, rrf_score)
    chunk_map: dict[str, VectorSearchResult] = {}
    rrf_scores: dict[str, float] = {}

    # 1. Score dense rankings (1-based rank)
    for rank, item in enumerate(dense_results, start=1):
        chunk_map[item.chunk_id] = item
        rrf_scores[item.chunk_id] = rrf_scores.get(item.chunk_id, 0.0) + (1.0 / (k + rank))

    # 2. Score lexical rankings (1-based rank)
    for rank, item in enumerate(lexical_results, start=1):
        if item.chunk_id not in chunk_map:
            chunk_map[item.chunk_id] = item
        rrf_scores[item.chunk_id] = rrf_scores.get(item.chunk_id, 0.0) + (1.0 / (k + rank))

    # 3. Sort by fused RRF score descending
    sorted_chunk_ids = sorted(
        rrf_scores.keys(),
        key=lambda cid: rrf_scores[cid],
        reverse=True,
    )

    if not sorted_chunk_ids:
        return []

    # Maximum possible score is if an item is rank 1 in both: 2 / (k + 1)
    max_possible_score = 2.0 / (k + 1.0)

    fused_results: list[VectorSearchResult] = []
    for cid in sorted_chunk_ids[:top_k]:
        base_item = chunk_map[cid]
        raw_rrf = rrf_scores[cid]
        # Normalize into [0, 1] relative to theoretical max
        normalized_score = min(1.0, max(0.01, raw_rrf / max_possible_score))

        fused_item = VectorSearchResult(
            chunk_id=base_item.chunk_id,
            document_id=base_item.document_id,
            owner_id=base_item.owner_id,
            text=base_item.text,
            score=normalized_score,
            page_number=base_item.page_number,
            chunk_index=base_item.chunk_index,
            metadata=dict(base_item.metadata or {}),
        )
        fused_results.append(fused_item)

    return fused_results
