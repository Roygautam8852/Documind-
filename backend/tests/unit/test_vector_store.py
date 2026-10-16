"""Unit tests for vector stores (MockVectorStore and ChromaVectorStore) and factory."""

from __future__ import annotations

from pathlib import Path
from unittest.mock import MagicMock

import pytest
from app.core.config import Settings
from app.providers.embeddings.mock_embeddings import MockEmbeddingProvider
from app.providers.vector_store.chroma_store import ChromaVectorStore
from app.providers.vector_store.factory import get_vector_store
from app.providers.vector_store.mock_store import MockVectorStore

# ── MockVectorStore Tests ──────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_mock_vector_store_add_and_count() -> None:
    store = MockVectorStore()
    embed = MockEmbeddingProvider()

    texts = ["First chunk text", "Second chunk text"]
    embeddings = await embed.embed_texts(texts)

    ids = await store.add_chunks(
        document_id="doc-1",
        owner_id="user-1",
        chunk_ids=["c-1", "c-2"],
        texts=texts,
        embeddings=embeddings,
        metadatas=[{"page_number": 1, "chunk_index": 0}, {"page_number": 1, "chunk_index": 1}],
    )

    assert len(ids) == 2
    assert await store.count(owner_id="user-1") == 2
    assert await store.count(owner_id="user-2") == 0


@pytest.mark.asyncio
async def test_mock_vector_store_query_and_isolation() -> None:
    store = MockVectorStore()
    embed = MockEmbeddingProvider()

    # User 1 chunks
    u1_texts = ["Artificial intelligence in healthcare", "Machine learning diagnostics"]
    u1_vecs = await embed.embed_texts(u1_texts)
    await store.add_chunks(
        document_id="doc-1",
        owner_id="user-1",
        chunk_ids=["u1-c1", "u1-c2"],
        texts=u1_texts,
        embeddings=u1_vecs,
        metadatas=[{"page_number": 1, "chunk_index": 0}, {"page_number": 1, "chunk_index": 1}],
    )

    # User 2 chunks
    u2_texts = ["Financial market analysis", "Portfolio optimization strategies"]
    u2_vecs = await embed.embed_texts(u2_texts)
    await store.add_chunks(
        document_id="doc-2",
        owner_id="user-2",
        chunk_ids=["u2-c1", "u2-c2"],
        texts=u2_texts,
        embeddings=u2_vecs,
        metadatas=[{"page_number": 1, "chunk_index": 0}, {"page_number": 1, "chunk_index": 1}],
    )

    # User 1 queries for healthcare
    q_vec = await embed.embed_query("healthcare diagnostics")
    u1_results = await store.query_similarity(
        query_vector=q_vec,
        owner_id="user-1",
        top_k=5,
    )
    assert len(u1_results) == 2
    assert all(r.owner_id == "user-1" for r in u1_results)
    assert u1_results[0].score >= u1_results[1].score

    # User 2 queries same vector — must NOT receive User 1's chunks
    u2_results = await store.query_similarity(
        query_vector=q_vec,
        owner_id="user-2",
        top_k=5,
    )
    assert len(u2_results) == 2
    assert all(r.owner_id == "user-2" for r in u2_results)
    assert not any(r.owner_id == "user-1" for r in u2_results)


@pytest.mark.asyncio
async def test_mock_vector_store_delete_document() -> None:
    store = MockVectorStore()
    embed = MockEmbeddingProvider()

    texts = ["Sample chunk"]
    vecs = await embed.embed_texts(texts)
    await store.add_chunks(
        document_id="doc-10",
        owner_id="user-10",
        chunk_ids=["c-10"],
        texts=texts,
        embeddings=vecs,
        metadatas=[{"page_number": 1}],
    )
    assert await store.count(owner_id="user-10") == 1

    await store.delete_document_vectors(document_id="doc-10", owner_id="user-10")
    assert await store.count(owner_id="user-10") == 0


# ── ChromaVectorStore Tests ────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_chroma_vector_store_add_and_query(tmp_path: Path) -> None:
    store = ChromaVectorStore(persist_directory=str(tmp_path / "chroma"))
    embed = MockEmbeddingProvider()

    texts = ["DocuMind retrieval augmented generation", "General unrelated text content"]
    vecs = await embed.embed_texts(texts)

    ids = await store.add_chunks(
        document_id="doc-chroma-1",
        owner_id="user-owner-1",
        chunk_ids=["chr-1", "chr-2"],
        texts=texts,
        embeddings=vecs,
        metadatas=[{"page_number": 1, "chunk_index": 0}, {"page_number": 2, "chunk_index": 1}],
    )
    assert len(ids) == 2
    assert await store.count(owner_id="user-owner-1") == 2

    # Query similarity
    q_vec = await embed.embed_query("retrieval augmented generation")
    results = await store.query_similarity(
        query_vector=q_vec,
        owner_id="user-owner-1",
        top_k=2,
    )
    assert len(results) > 0
    assert results[0].owner_id == "user-owner-1"
    assert results[0].document_id == "doc-chroma-1"
    assert results[0].chunk_id == "chr-1"
    assert 0.0 <= results[0].score <= 1.0

    # Cross-tenant check: user-owner-2 must see 0 results
    results_other = await store.query_similarity(
        query_vector=q_vec,
        owner_id="user-owner-2",
        top_k=2,
    )
    assert len(results_other) == 0

    # Delete
    await store.delete_document_vectors(document_id="doc-chroma-1", owner_id="user-owner-1")
    assert await store.count(owner_id="user-owner-1") == 0


@pytest.mark.asyncio
async def test_chroma_vector_store_document_filter(tmp_path: Path) -> None:
    store = ChromaVectorStore(persist_directory=str(tmp_path / "chroma_filter"))
    embed = MockEmbeddingProvider()

    vecs1 = await embed.embed_texts(["Chunk from doc A"])
    await store.add_chunks(
        document_id="doc-A",
        owner_id="user-filter",
        chunk_ids=["cA-1"],
        texts=["Chunk from doc A"],
        embeddings=vecs1,
        metadatas=[{"page_number": 1, "chunk_index": 0}],
    )

    vecs2 = await embed.embed_texts(["Chunk from doc B"])
    await store.add_chunks(
        document_id="doc-B",
        owner_id="user-filter",
        chunk_ids=["cB-1"],
        texts=["Chunk from doc B"],
        embeddings=vecs2,
        metadatas=[{"page_number": 1, "chunk_index": 0}],
    )

    q_vec = await embed.embed_query("Chunk")
    # Filter strictly to doc-B
    results = await store.query_similarity(
        query_vector=q_vec,
        owner_id="user-filter",
        document_ids=["doc-B"],
        top_k=5,
    )
    assert len(results) == 1
    assert results[0].document_id == "doc-B"


# ── Vector Store Factory Tests ─────────────────────────────────────────────────


def test_vector_store_factory(tmp_path: Path) -> None:
    mock_settings = MagicMock(spec=Settings)
    mock_settings.vector_store = "mock"
    mock_settings.chroma_persist_dir = str(tmp_path / "c1")

    store_mock = get_vector_store(mock_settings)
    assert isinstance(store_mock, MockVectorStore)

    chroma_settings = MagicMock(spec=Settings)
    chroma_settings.vector_store = "chroma"
    chroma_settings.chroma_persist_dir = str(tmp_path / "c2")

    store_chroma = get_vector_store(chroma_settings)
    assert isinstance(store_chroma, ChromaVectorStore)

    bad_settings = MagicMock(spec=Settings)
    bad_settings.vector_store = "unsupported_store"
    bad_settings.chroma_persist_dir = str(tmp_path / "c3")
    with pytest.raises(ValueError, match="Unknown vector store type"):
        get_vector_store(bad_settings)
