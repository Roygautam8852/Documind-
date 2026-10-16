"""Integration tests for Summaries & Multi-Doc API endpoints."""

from __future__ import annotations

from pathlib import Path
from unittest.mock import patch

import app.providers.embeddings.factory as emb_factory
import app.providers.llm.factory as llm_factory
import app.providers.vector_store.factory as vs_factory
import pytest
from app.core.config import get_settings
from app.services.ingestion_service import _ingest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession


async def _register_user(client: AsyncClient, email: str) -> tuple[str, str]:
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
    monkeypatch.setenv("CHROMA_PERSIST_DIR", str(tmp_path / "chroma"))
    monkeypatch.setenv("UPLOAD_DIR", str(tmp_path / "uploads"))
    monkeypatch.setenv("VECTOR_STORE", "chroma")
    monkeypatch.setenv("EMBEDDING_PROVIDER", "mock")
    monkeypatch.setenv("LLM_PROVIDER", "mock")
    get_settings.cache_clear()

    emb_factory._provider_instance = None
    vs_factory._store_instance = None
    llm_factory._provider_instance = None


async def _setup_ready_document(
    client: AsyncClient,
    db_session: AsyncSession,
    user_id: str,
    token: str,
    filename: str,
    content: str,
) -> str:
    with patch("app.services.ingestion_service.schedule_ingestion"):
        upload_resp = await client.post(
            "/api/v1/documents",
            headers=_auth(token),
            files={"file": (filename, content.encode("utf-8"), "text/plain")},
        )
    assert upload_resp.status_code == 202
    doc_id = upload_resp.json()["id"]

    await _ingest(db_session, doc_id, user_id)
    await db_session.commit()
    return doc_id


@pytest.mark.asyncio
async def test_chat_summarize_endpoint(client: AsyncClient, db_session: AsyncSession) -> None:
    user_id, token = await _register_user(client, "chat_sum@example.com")
    doc_id = await _setup_ready_document(
        client,
        db_session,
        user_id,
        token,
        "policy.txt",
        "Company travel reimbursement policy: Flights under five hours must be economy class.",
    )

    resp = await client.post(
        f"/api/v1/chat/summarize/{doc_id}",
        headers=_auth(token),
        json={"summary_type": "executive", "focus": "travel class rules"},
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["document_id"] == doc_id
    assert data["filename"] == "policy.txt"
    assert data["summary_type"] == "executive"
    assert "Executive Summary" in data["summary"]
    assert len(data["citations"]) >= 1
    assert data["total_chunks_processed"] >= 1


@pytest.mark.asyncio
async def test_summaries_document_endpoint_with_conversation(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    user_id, token = await _register_user(client, "sum_conv_api@example.com")
    doc_id = await _setup_ready_document(
        client,
        db_session,
        user_id,
        token,
        "handbook.txt",
        "Employee benefit package includes health insurance and four weeks paid vacation.",
    )

    # First initialize a conversation thread via chat query or empty thread
    chat_resp = await client.post(
        "/api/v1/chat/query",
        headers=_auth(token),
        json={"question": "What is the handbook title?", "document_ids": [doc_id]},
    )
    assert chat_resp.status_code == 200
    conv_id = chat_resp.json()["conversation_id"]
    assert conv_id is not None

    # Summarize document attaching to existing conversation
    sum_resp = await client.post(
        f"/api/v1/summaries/documents/{doc_id}",
        headers=_auth(token),
        json={
            "summary_type": "bullet_points",
            "conversation_id": conv_id,
        },
    )
    assert sum_resp.status_code == 200, sum_resp.text
    data = sum_resp.json()
    assert data["summary_type"] == "bullet_points"
    assert data["conversation_id"] == conv_id

    # Check that conversation thread now has 4 messages (2 from initial query, 2 from summary)
    detail_resp = await client.get(f"/api/v1/conversations/{conv_id}", headers=_auth(token))
    assert detail_resp.status_code == 200
    conv_data = detail_resp.json()
    assert len(conv_data["messages"]) == 4


@pytest.mark.asyncio
async def test_summaries_compare_endpoint(client: AsyncClient, db_session: AsyncSession) -> None:
    user_id, token = await _register_user(client, "compare_api@example.com")
    doc1 = await _setup_ready_document(
        client,
        db_session,
        user_id,
        token,
        "alpha.txt",
        "Alpha architecture utilizes microservices with gRPC communication.",
    )
    doc2 = await _setup_ready_document(
        client,
        db_session,
        user_id,
        token,
        "beta.txt",
        "Beta architecture utilizes event-driven messaging with Kafka streaming.",
    )

    resp = await client.post(
        "/api/v1/summaries/compare",
        headers=_auth(token),
        json={
            "document_ids": [doc1, doc2],
            "focus": "communication protocol and architecture",
        },
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert len(data["document_ids"]) == 2
    assert "Cross-Document Comparison" in data["comparison"]
    assert len(data["documents_compared"]) == 2
    assert len(data["citations"]) >= 1


@pytest.mark.asyncio
async def test_summaries_endpoints_multi_tenant_isolation(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    user_a, token_a = await _register_user(client, "tenant_a@example.com")
    user_b, token_b = await _register_user(client, "tenant_b@example.com")

    doc_a = await _setup_ready_document(
        client,
        db_session,
        user_a,
        token_a,
        "private_a.txt",
        "Strictly proprietary financial data for tenant A.",
    )
    doc_b = await _setup_ready_document(
        client,
        db_session,
        user_b,
        token_b,
        "public_b.txt",
        "General public notice for tenant B.",
    )

    # User B attempts to summarize User A's document -> 404
    resp = await client.post(
        f"/api/v1/summaries/documents/{doc_a}",
        headers=_auth(token_b),
        json={"summary_type": "executive"},
    )
    assert resp.status_code == 404

    # User B attempts to compare their document with User A's document -> 404
    comp_resp = await client.post(
        "/api/v1/summaries/compare",
        headers=_auth(token_b),
        json={"document_ids": [doc_b, doc_a]},
    )
    assert comp_resp.status_code == 404


@pytest.mark.asyncio
async def test_summaries_compare_validation_error(client: AsyncClient) -> None:
    _, token = await _register_user(client, "val_error@example.com")

    # Less than 2 documents provided
    resp = await client.post(
        "/api/v1/summaries/compare",
        headers=_auth(token),
        json={"document_ids": ["single-doc"]},
    )
    assert resp.status_code == 422
