"""Embedding providers package."""

from app.providers.embeddings.base import BaseEmbeddingProvider
from app.providers.embeddings.factory import get_embedding_provider

__all__ = ["BaseEmbeddingProvider", "get_embedding_provider"]
