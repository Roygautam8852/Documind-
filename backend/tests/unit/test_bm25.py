"""Unit tests for BM25 lexical retriever and tokenizer."""

from __future__ import annotations

import pytest
from app.models.chunk import Chunk
from app.rag.bm25 import BM25Retriever, tokenize
from sqlalchemy.ext.asyncio import AsyncSession


def test_tokenize_filters_stopwords_and_symbols() -> None:
    text = "The quick brown fox jumps over the lazy dog! And what about that?"
    tokens = tokenize(text)
    assert "the" not in tokens
    assert "and" not in tokens
    assert "about" not in tokens
    assert "quick" in tokens
    assert "brown" in tokens
    assert "fox" in tokens
    assert "jumps" in tokens
    assert "lazy" in tokens
    assert "dog" in tokens


@pytest.mark.asyncio
async def test_bm25_retriever_ranking_and_isolation(db_session: AsyncSession) -> None:
    retriever = BM25Retriever()

    # Create test chunks in db
    chunk1 = Chunk(
        id="c1",
        document_id="doc1",
        owner_id="user_alice",
        chunk_index=0,
        text="The AES-256 encryption standard guarantees data confidentiality at rest.",
    )
    chunk2 = Chunk(
        id="c2",
        document_id="doc1",
        owner_id="user_alice",
        chunk_index=1,
        text="Network transmission uses TLS 1.3 encryption protocol for secure packets.",
    )
    chunk3 = Chunk(
        id="c3",
        document_id="doc2",
        owner_id="user_bob",
        chunk_index=0,
        text="Bob private notes on AES-256 encryption standard and cipher keys.",
    )

    db_session.add_all([chunk1, chunk2, chunk3])
    await db_session.flush()

    # 1. Search for AES-256 by user_alice
    results = await retriever.search(
        db=db_session,
        query="What is the AES-256 standard?",
        owner_id="user_alice",
        top_k=5,
    )
    assert len(results) >= 1
    assert results[0].chunk_id == "c1"
    assert "AES-256" in results[0].text
    # Bob's chunk must be excluded
    assert all(r.owner_id == "user_alice" for r in results)

    # 2. Search with document filtering
    doc_results = await retriever.search(
        db=db_session,
        query="encryption",
        owner_id="user_alice",
        document_ids=["doc_non_existent"],
        top_k=5,
    )
    assert doc_results == []

    # 3. Query with non-matching keywords
    empty_results = await retriever.search(
        db=db_session,
        query="quantum teleportation teleport",
        owner_id="user_alice",
        top_k=5,
    )
    assert empty_results == []
