"""Integration tests for the chunking, embedding, and vector retrieval pipeline."""

from __future__ import annotations

from pathlib import Path
from unittest.mock import patch

import app.providers.embeddings.factory as emb_factory
import app.providers.vector_store.factory as vs_factory
import pytest
from app.core.config import get_settings
from app.models.chunk import Chunk
from app.providers.embeddings.factory import get_embedding_provider
from app.providers.vector_store.factory import get_vector_store
from app.services.ingestion_service import _ingest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession


async def _register_user(client: AsyncClient, email: str) -> tuple[str, str]:
    resp = await client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": "testpassword123"},
    )
    assert resp.status_code == 201, resp.text
    token = resp.json()["access_token"]
    me_resp = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_resp.status_code == 200, me_resp.text
    return me_resp.json()["id"], token


@pytest.mark.asyncio
async def test_chunking_embedding_retrieval_pipeline_lifecycle(
    client: AsyncClient,
    db_session: AsyncSession,
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Full pipeline integration test:

    1. User uploads a multi-page document.
    2. Document runs through ingestion: parsed -> chunked -> embedded -> vector store indexed.
    3. Database contains Chunk records with token_count, chunk_index, and vector_id.
    4. Vector store allows semantic retrieval by vector with correct metadata.
    5. Cross-tenant isolation ensures another user cannot retrieve these chunks.
    6. Re-indexing is idempotent (no duplicate chunks or vector collisions).
    7. Document deletion purges both DB chunks and vector store entries.
    """
    monkeypatch.setenv("CHROMA_PERSIST_DIR", str(tmp_path / "chroma"))
    monkeypatch.setenv("UPLOAD_DIR", str(tmp_path / "uploads"))
    monkeypatch.setenv("VECTOR_STORE", "chroma")
    monkeypatch.setenv("EMBEDDING_PROVIDER", "mock")
    get_settings.cache_clear()

    emb_factory._provider_instance = None
    vs_factory._store_instance = None

    user_id_1, token_1 = await _register_user(client, "alice@example.com")
    user_id_2, token_2 = await _register_user(client, "bob@example.com")

    paragraphs = [
        f"Section {i}: DocuMind Architectural Component. "
        f"This section describes sub-system {i} of the document platform. "
        f"Each passage undergoes preprocessing, semantic analysis, and token verification. "
        f"Deep neural embeddings map the content into high-dimensional vector space."
        for i in range(1, 8)
    ]
    content = "\n\n".join(paragraphs)

    # 1. Upload document as Alice
    with patch("app.services.ingestion_service.schedule_ingestion"):
        upload_resp = await client.post(
            "/api/v1/documents",
            files={"file": ("architecture.txt", content.encode("utf-8"), "text/plain")},
            headers={"Authorization": f"Bearer {token_1}"},
        )
    assert upload_resp.status_code == 202
    doc_id = upload_resp.json()["id"]

    # 2. Ingest document
    await _ingest(db_session, doc_id, user_id_1)
    await db_session.commit()

    # 3. Verify DB chunks
    chunks_res = await db_session.execute(
        select(Chunk).where(Chunk.document_id == doc_id).order_by(Chunk.chunk_index.asc())
    )
    chunks = list(chunks_res.scalars().all())
    assert len(chunks) >= 2, "Expected multiple chunks for multi-paragraph document"

    for i, chk in enumerate(chunks):
        assert chk.chunk_index == i
        assert chk.owner_id == user_id_1
        assert chk.token_count is not None and chk.token_count > 0
        assert chk.vector_id is not None
        assert chk.vector_id.startswith("chroma_")

    # 4. Semantic vector search
    embed_provider = get_embedding_provider()
    vector_store = get_vector_store()

    query_vec = await embed_provider.embed_query("neural embeddings and vector space")
    results_alice = await vector_store.query_similarity(
        query_vector=query_vec,
        owner_id=user_id_1,
        top_k=5,
    )
    assert len(results_alice) > 0
    top_match = results_alice[0]
    assert top_match.owner_id == user_id_1
    assert top_match.document_id == doc_id
    assert 0.0 <= top_match.score <= 1.0

    # 5. Cross-tenant isolation: Bob searches with the exact same vector
    results_bob = await vector_store.query_similarity(
        query_vector=query_vec,
        owner_id=user_id_2,
        top_k=5,
    )
    assert len(results_bob) == 0, "Bob must not retrieve any of Alice's chunks"

    # 6. Idempotent re-indexing
    await _ingest(db_session, doc_id, user_id_1)
    await db_session.commit()

    reindexed_res = await db_session.execute(
        select(Chunk).where(Chunk.document_id == doc_id).order_by(Chunk.chunk_index.asc())
    )
    reindexed_chunks = list(reindexed_res.scalars().all())
    assert len(reindexed_chunks) == len(chunks), "Re-indexing must not produce duplicate chunks"
    assert len({c.chunk_index for c in reindexed_chunks}) == len(reindexed_chunks)

    # Vector count for Alice should remain equal to chunk count
    vector_count = await vector_store.count(owner_id=user_id_1)
    assert vector_count == len(reindexed_chunks)

    # 7. Document deletion
    del_resp = await client.delete(
        f"/api/v1/documents/{doc_id}",
        headers={"Authorization": f"Bearer {token_1}"},
    )
    assert del_resp.status_code == 204

    # Verify vectors purged
    post_del_vector_count = await vector_store.count(owner_id=user_id_1)
    assert post_del_vector_count == 0
