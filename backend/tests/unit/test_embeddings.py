"""Unit tests for embedding providers and factory."""

from __future__ import annotations

import math
from unittest.mock import MagicMock

import pytest
from app.core.config import Settings
from app.providers.embeddings.factory import get_embedding_provider
from app.providers.embeddings.mock_embeddings import MockEmbeddingProvider
from app.providers.embeddings.sentence_transformer import SentenceTransformerEmbeddingProvider


@pytest.mark.asyncio
async def test_mock_embedding_provider_dimension_and_model() -> None:
    provider = MockEmbeddingProvider()
    assert provider.dimension == 384
    assert provider.model_name == "mock-mini-lm"


@pytest.mark.asyncio
async def test_mock_embedding_deterministic() -> None:
    """Identical input texts must produce identical vectors."""
    provider = MockEmbeddingProvider()
    text = "DocuMind semantic search and intelligence"

    vecs1 = await provider.embed_texts([text])
    vecs2 = await provider.embed_texts([text])
    q_vec = await provider.embed_query(text)

    assert len(vecs1) == 1
    assert vecs1[0] == vecs2[0]
    assert vecs1[0] == q_vec


@pytest.mark.asyncio
async def test_mock_embedding_distinct_texts() -> None:
    """Distinct texts should produce distinct vectors."""
    provider = MockEmbeddingProvider()
    vecs = await provider.embed_texts(["Alpha query", "Beta query"])
    assert len(vecs) == 2
    assert vecs[0] != vecs[1]


@pytest.mark.asyncio
async def test_mock_embedding_vectors_are_unit_normalized() -> None:
    """All generated vectors must have an L2 norm of 1.0 (within float epsilon)."""
    provider = MockEmbeddingProvider()
    texts = [
        "First test document paragraph",
        "Second paragraph with different content",
        "Third query",
    ]
    vectors = await provider.embed_texts(texts)

    for vec in vectors:
        assert len(vec) == 384
        l2_norm = math.sqrt(sum(x * x for x in vec))
        assert pytest.approx(l2_norm, abs=1e-5) == 1.0


@pytest.mark.asyncio
async def test_mock_embedding_empty_input() -> None:
    provider = MockEmbeddingProvider()
    assert await provider.embed_texts([]) == []


def test_embedding_factory() -> None:
    mock_settings = MagicMock(spec=Settings)
    mock_settings.embedding_provider = "mock"
    mock_settings.embedding_model = "all-MiniLM-L6-v2"

    provider1 = get_embedding_provider(mock_settings)
    assert isinstance(provider1, MockEmbeddingProvider)

    # Calling again returns cached provider
    provider2 = get_embedding_provider(mock_settings)
    assert provider1 is provider2

    # Unknown provider raises ValueError
    bad_settings = MagicMock(spec=Settings)
    bad_settings.embedding_provider = "unknown_provider"
    with pytest.raises(ValueError, match="Unknown embedding provider"):
        get_embedding_provider(bad_settings)


def test_sentence_transformer_lazy_load() -> None:
    """SentenceTransformerEmbeddingProvider should not load model until embed is called."""
    provider = SentenceTransformerEmbeddingProvider(model_name="all-MiniLM-L6-v2")
    assert provider._model is None
    assert provider.dimension == 384
    assert provider.model_name == "all-MiniLM-L6-v2"
