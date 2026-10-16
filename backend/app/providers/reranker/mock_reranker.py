"""Deterministic mock reranker for testing and development environments."""

from __future__ import annotations

import re
from collections.abc import Sequence

from app.providers.reranker.base import BaseReranker
from app.providers.vector_store.base import VectorSearchResult

_TOKEN_PATTERN = re.compile(r"\b\w+\b")


class MockReranker(BaseReranker):
    """Deterministic reranker based on lexical query token overlap."""

    async def rerank(
        self,
        query: str,
        candidates: Sequence[VectorSearchResult],
        top_k: int = 5,
    ) -> list[VectorSearchResult]:
        if not candidates:
            return []

        query_tokens = set(_TOKEN_PATTERN.findall(query.lower()))
        if not query_tokens:
            return list(candidates[:top_k])

        scored: list[tuple[VectorSearchResult, float, float]] = []
        for c in candidates:
            chunk_tokens = set(_TOKEN_PATTERN.findall(c.text.lower()))
            overlap = len(query_tokens.intersection(chunk_tokens))
            rank_score = (overlap * 1.0) + c.score
            final_score = max(c.score, min(1.0, 0.4 + 0.1 * overlap))
            scored.append((c, rank_score, final_score))

        # Sort descending by rank score
        scored.sort(key=lambda x: x[1], reverse=True)

        reranked_results: list[VectorSearchResult] = []
        for c, _, final_score in scored[:top_k]:
            reranked_results.append(
                VectorSearchResult(
                    chunk_id=c.chunk_id,
                    document_id=c.document_id,
                    owner_id=c.owner_id,
                    text=c.text,
                    score=final_score,
                    page_number=c.page_number,
                    chunk_index=c.chunk_index,
                    metadata=dict(c.metadata or {}),
                )
            )

        return reranked_results
