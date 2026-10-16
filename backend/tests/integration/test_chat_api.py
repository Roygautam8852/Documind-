"""Integration tests for the RAG Chat API (POST /api/v1/chat/query)."""

from __future__ import annotations

from pathlib import Path
from unittest.mock import patch

import app.providers.embeddings.factory as emb_factory
import app.providers.llm.factory as llm_factory
import app.providers.vector_store.factory as vs_factory
import pytest
from app.core.config import get_settings
from app.models.document import Document
from app.rag.abstention import ABSTENTION_MESSAGE
from app.services.ingestion_service import _ingest
from httpx import AsyncClient
from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession


async def _register_user(client: AsyncClient, email: str) -> tuple[str, str]:
    """Helper to register user and obtain user_id + bearer token."""
    resp = await client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": "securepassword123"},
    )
    assert resp.status_code == 201, resp.text
    token = resp.json()["access_token"]
    me_resp = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_resp.status_code == 200, me_resp.text
    return me_resp.json()["id"], token


def _auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(autouse=True)
def _setup_test_env(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    """Ensure all test runs use temporary chroma and upload directories with mock providers."""
    monkeypatch.setenv("CHROMA_PERSIST_DIR", str(tmp_path / "chroma"))
    monkeypatch.setenv("UPLOAD_DIR", str(tmp_path / "uploads"))
    monkeypatch.setenv("VECTOR_STORE", "chroma")
    monkeypatch.setenv("EMBEDDING_PROVIDER", "mock")
    monkeypatch.setenv("LLM_PROVIDER", "mock")
    get_settings.cache_clear()

    emb_factory._provider_instance = None
    vs_factory._store_instance = None
    llm_factory._provider_instance = None


@pytest.mark.asyncio
async def test_chat_query_grounded_answer(client: AsyncClient, db_session: AsyncSession) -> None:
    """Full lifecycle: upload doc -> ingest -> query -> grounded answer with valid citations."""
    user_id, token = await _register_user(client, "alice_chat@example.com")

    content = (
        "DocuMind Platform Architecture.\n\n"
        "DocuMind utilizes multi-tenant vector storage with cosine distance metric.\n"
        "Customer passages are strictly isolated using cryptographic tenant tokens.\n\n"
        "Cognitive Retrieval Engine.\n\n"
        "The retrieval pipeline incorporates paragraph-aware chunking and deep neural embeddings."
    )

    # 1. Upload document
    with patch("app.services.ingestion_service.schedule_ingestion"):
        upload_resp = await client.post(
            "/api/v1/documents",
            files={"file": ("architecture.txt", content.encode("utf-8"), "text/plain")},
            headers=_auth(token),
        )
    assert upload_resp.status_code == 202
    doc_id = upload_resp.json()["id"]

    # 2. Ingest document
    await _ingest(db_session, doc_id, user_id)
    await db_session.commit()

    # 3. Query chat API
    query_resp = await client.post(
        "/api/v1/chat/query",
        json={"question": "How does DocuMind isolate tenant document passages?"},
        headers=_auth(token),
    )
    assert query_resp.status_code == 200
    data = query_resp.json()

    assert "answer" in data
    assert "citations" in data
    assert "retrieval" in data
    assert "request_id" in data

    # Grounded answer checks
    assert "[S1]" in data["answer"]
    assert len(data["citations"]) >= 1
    citation = data["citations"][0]
    assert citation["citation_id"] == "S1"
    assert citation["document_id"] == doc_id
    assert citation["filename"] == "architecture.txt"
    assert citation["snippet"] is not None and len(citation["snippet"]) > 0
    assert data["retrieval"]["result_count"] >= 1


@pytest.mark.asyncio
async def test_chat_query_abstention_on_empty_evidence(client: AsyncClient) -> None:
    """When user has no ready documents, query returns abstention message with zero citations."""
    _, token = await _register_user(client, "empty_user@example.com")

    resp = await client.post(
        "/api/v1/chat/query",
        json={"question": "What is the capital of Mars?"},
        headers=_auth(token),
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["answer"] == ABSTENTION_MESSAGE
    assert data["citations"] == []
    assert data["retrieval"]["result_count"] == 0


@pytest.mark.asyncio
async def test_chat_query_document_filtering(client: AsyncClient, db_session: AsyncSession) -> None:
    """Querying with document_ids scopes retrieval exclusively to those documents."""
    user_id, token = await _register_user(client, "filter_user@example.com")

    # Document A
    with patch("app.services.ingestion_service.schedule_ingestion"):
        up_a = await client.post(
            "/api/v1/documents",
            files={
                "file": (
                    "finance.txt",
                    b"Q3 financial revenue surged by twenty percent.",
                    "text/plain",
                )
            },
            headers=_auth(token),
        )
    doc_a_id = up_a.json()["id"]
    await _ingest(db_session, doc_a_id, user_id)

    # Document B
    with patch("app.services.ingestion_service.schedule_ingestion"):
        up_b = await client.post(
            "/api/v1/documents",
            files={
                "file": (
                    "biology.txt",
                    b"Cellular mitosis divides eukaryotic chromosomes.",
                    "text/plain",
                )
            },
            headers=_auth(token),
        )
    doc_b_id = up_b.json()["id"]
    await _ingest(db_session, doc_b_id, user_id)
    await db_session.commit()

    # Query targeting solely Document B
    query_resp = await client.post(
        "/api/v1/chat/query",
        json={"question": "Tell me about chromosomes and mitosis.", "document_ids": [doc_b_id]},
        headers=_auth(token),
    )
    assert query_resp.status_code == 200
    data = query_resp.json()

    for citation in data["citations"]:
        assert citation["document_id"] == doc_b_id
        assert citation["filename"] == "biology.txt"


@pytest.mark.asyncio
async def test_cross_tenant_document_query_prevention(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    """User B cannot query User A's document IDs."""
    user_a_id, token_a = await _register_user(client, "user_a@example.com")
    _, token_b = await _register_user(client, "user_b@example.com")

    with patch("app.services.ingestion_service.schedule_ingestion"):
        up_a = await client.post(
            "/api/v1/documents",
            files={
                "file": (
                    "confidential.txt",
                    b"Top secret operational blueprints.",
                    "text/plain",
                )
            },
            headers=_auth(token_a),
        )
    doc_a_id = up_a.json()["id"]
    await _ingest(db_session, doc_a_id, user_a_id)
    await db_session.commit()

    # User B explicitly specifies User A's document ID -> 404
    resp = await client.post(
        "/api/v1/chat/query",
        json={"question": "What are the secret blueprints?", "document_ids": [doc_a_id]},
        headers=_auth(token_b),
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_chat_query_not_ready_document_rejected(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    """Querying a document that is not in 'ready' status returns 409 Conflict."""
    user_id, token = await _register_user(client, "processing_user@example.com")

    with patch("app.services.ingestion_service.schedule_ingestion"):
        up = await client.post(
            "/api/v1/documents",
            files={"file": ("pending.txt", b"Content pending processing.", "text/plain")},
            headers=_auth(token),
        )
    doc_id = up.json()["id"]

    # Mark as processing
    await db_session.execute(
        update(Document).where(Document.id == doc_id).values(status="processing")
    )
    await db_session.commit()

    resp = await client.post(
        "/api/v1/chat/query",
        json={"question": "Query pending doc", "document_ids": [doc_id]},
        headers=_auth(token),
    )
    assert resp.status_code == 409
    assert resp.json()["error_code"] == "document_not_ready"


@pytest.mark.asyncio
async def test_chat_query_requires_auth(client: AsyncClient) -> None:
    resp = await client.post(
        "/api/v1/chat/query",
        json={"question": "Unauthorized query"},
    )
    assert resp.status_code == 401
