"""Abstract base interface for text embedding providers."""

from __future__ import annotations

from abc import ABC, abstractmethod


class BaseEmbeddingProvider(ABC):
    """Abstract base interface for generating vector embeddings from text."""

    @property
    @abstractmethod
    def dimension(self) -> int:
        """Return the vector dimensionality (e.g. 384 for all-MiniLM-L6-v2)."""
        ...

    @property
    @abstractmethod
    def model_name(self) -> str:
        """Return the identifier of the embedding model in use."""
        ...

    @abstractmethod
    async def embed_texts(self, texts: list[str]) -> list[list[float]]:
        """Generate normalized vector embeddings for a batch of text chunks.

        Args:
            texts: List of text strings to embed.

        Returns:
            List of float vectors, where len(vector) == self.dimension.
        """
        ...

    @abstractmethod
    async def embed_query(self, query: str) -> list[float]:
        """Generate a normalized vector embedding for a single search query.

        Args:
            query: The search query string.

        Returns:
            A single float vector where len(vector) == self.dimension.
        """
        ...
