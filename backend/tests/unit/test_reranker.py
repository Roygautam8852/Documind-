"""Unit tests for reranker interface, mock implementation, and factory."""

from __future__ import annotations

import app.providers.reranker.factory as reranker_factory
import pytest
from app.core.config import Settings
from app.providers.reranker.factory import get_reranker
from app.providers.reranker.mock_reranker import MockReranker
from app.providers.vector_store.base import VectorSearchResult


def _make_candidate(cid: str, text: str, score: float) -> VectorSearchResult:
    return VectorSearchResult(
        chunk_id=cid,
        document_id="doc1",
        owner_id="user1",
        text=text,
        score=score,
        page_number=1,
        chunk_index=0,
    )


@pytest.mark.asyncio
async def test_mock_reranker_reorders_by_query_overlap() -> None:
    reranker = MockReranker()

    candidates = [
        _make_candidate("c1", "General introduction to web servers and networking.", 0.90),
        _make_candidate("c2", "Cryptographic key generation using AES-256 cipher standard.", 0.70),
    ]

    # Query specifically targeting AES-256
    results = await reranker.rerank(
        query="AES-256 cipher standard",
        candidates=candidates,
        top_k=2,
    )

    assert len(results) == 2
    # c2 has high overlap with query terms "AES-256", "cipher", "standard"
    assert results[0].chunk_id == "c2"
    assert results[1].chunk_id == "c1"


def test_reranker_factory_dispatch() -> None:
    reranker_factory._reranker_instance = None
    reranker_factory._cached_provider_name = None

    # Test "none" returns None
    cfg_none = Settings(
        database_url="sqlite+aiosqlite:///:memory:",
        jwt_secret="secret-for-test-32chars!",
        reranker_provider="none",
    )
    assert get_reranker(cfg_none) is None

    # Test "mock" returns MockReranker
    cfg_mock = Settings(
        database_url="sqlite+aiosqlite:///:memory:",
        jwt_secret="secret-for-test-32chars!",
        reranker_provider="mock",
    )
    reranker = get_reranker(cfg_mock)
    assert isinstance(reranker, MockReranker)
