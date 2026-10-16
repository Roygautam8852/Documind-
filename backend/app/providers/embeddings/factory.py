"""Embedding provider factory."""

from __future__ import annotations

from app.core.config import Settings, get_settings
from app.providers.embeddings.base import BaseEmbeddingProvider
from app.providers.embeddings.mock_embeddings import MockEmbeddingProvider
from app.providers.embeddings.sentence_transformer import SentenceTransformerEmbeddingProvider

_provider_instance: BaseEmbeddingProvider | None = None
_cached_provider_type: str | None = None


def get_embedding_provider(settings: Settings | None = None) -> BaseEmbeddingProvider:
    """Return the configured embedding provider instance.

    Uses settings.embedding_provider ('sentence_transformers' or 'mock').
    """
    global _provider_instance, _cached_provider_type

    cfg = settings or get_settings()
    provider_type = cfg.embedding_provider

    if _provider_instance is None or _cached_provider_type != provider_type:
        if provider_type == "mock":
            _provider_instance = MockEmbeddingProvider(model_name=cfg.embedding_model)
        elif provider_type == "sentence_transformers":
            _provider_instance = SentenceTransformerEmbeddingProvider(
                model_name=cfg.embedding_model
            )
        else:
            raise ValueError(f"Unknown embedding provider: {provider_type}")
        _cached_provider_type = provider_type

    return _provider_instance
