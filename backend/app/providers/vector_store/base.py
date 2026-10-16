"""Abstract base interface for vector database adapters."""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any


@dataclass
class VectorSearchResult:
    """A single chunk match retrieved from vector search."""

    chunk_id: str
    document_id: str
    owner_id: str
    text: str
    score: float
    page_number: int | None = None
    chunk_index: int = 0
    metadata: dict[str, Any] = field(default_factory=dict)


class BaseVectorStore(ABC):
    """Abstract interface for storing and searching vector embeddings."""

    @abstractmethod
    async def add_chunks(
        self,
        document_id: str,
        owner_id: str,
        chunk_ids: list[str],
        texts: list[str],
        embeddings: list[list[float]],
        metadatas: list[dict[str, Any]],
    ) -> list[str]:
        """Index a batch of chunks and their embedding vectors.

        Args:
            document_id: Source document ID.
            owner_id: Owning user ID (for multi-tenant isolation).
            chunk_ids: Unique UUID for each chunk.
            texts: Plain text of each chunk.
            embeddings: Normalized vector embeddings.
            metadatas: Additional metadata dictionary per chunk.

        Returns:
            List of vector IDs stored.
        """
        ...

    @abstractmethod
    async def query_similarity(
        self,
        query_vector: list[float],
        owner_id: str,
        document_ids: list[str] | None = None,
        top_k: int = 5,
        score_threshold: float = 0.0,
    ) -> list[VectorSearchResult]:
        """Search for top-k chunks most similar to the query vector.

        Must filter by owner_id to strictly prevent cross-user data leakage.

        Args:
            query_vector: Embedded query vector.
            owner_id: Required user ID scope.
            document_ids: Optional document filter.
            top_k: Maximum number of chunks to return.
            score_threshold: Minimum similarity score threshold (0.0 to 1.0).

        Returns:
            Ranked list of VectorSearchResult matches.
        """
        ...

    @abstractmethod
    async def delete_document_vectors(self, document_id: str, owner_id: str) -> None:
        """Purge all vector entries belonging to a given document and owner."""
        ...

    @abstractmethod
    async def count(self, owner_id: str | None = None) -> int:
        """Return total number of vectors in the store, optionally filtered by owner."""
        ...
