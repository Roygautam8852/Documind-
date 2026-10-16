"""Abstract base class for cross-encoder and neural rerankers."""

from __future__ import annotations

from abc import ABC, abstractmethod
from collections.abc import Sequence

from app.providers.vector_store.base import VectorSearchResult


class BaseReranker(ABC):
    """Abstract interface for reranking candidate retrieved chunks."""

    @abstractmethod
    async def rerank(
        self,
        query: str,
        candidates: Sequence[VectorSearchResult],
        top_k: int = 5,
    ) -> list[VectorSearchResult]:
        """Score and reorder candidate chunks against the input query.

        Args:
            query: The search query string.
            candidates: Candidate chunks from initial vector/hybrid retrieval.
            top_k: Maximum number of reranked chunks to return.

        Returns:
            Reranked list of VectorSearchResult objects sorted by relevance.
        """
