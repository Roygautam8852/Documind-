"""Integration tests for Advanced Retrieval (Hybrid Search & Query Reformulation)."""

from __future__ import annotations

from pathlib import Path
from unittest.mock import patch

import app.providers.embeddings.factory as emb_factory
import app.providers.llm.factory as llm_factory
import app.providers.reranker.factory as reranker_factory
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
    monkeypatch.setenv("HYBRID_SEARCH_ENABLED", "true")
    monkeypatch.setenv("RERANKER_PROVIDER", "mock")
    get_settings.cache_clear()

    emb_factory._provider_instance = None
    vs_factory._store_instance = None
    llm_factory._provider_instance = None
    reranker_factory._reranker_instance = None


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
async def test_hybrid_search_retrieval_and_metadata(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    user_id, token = await _register_user(client, "adv_user1@example.com")

    content = (
        "DocuMind System Error Code Manual.\n\n"
        "Error Code ERR_7034_SOCKET_TIMEOUT occurs when upstream worker pool is exhausted.\n"
        "Remediation requires increasing the connection limit to 500 connections."
    )
    await _setup_ready_document(client, db_session, user_id, token, "error_codes.txt", content)

    resp = await client.post(
        "/api/v1/chat/query",
        headers=_auth(token),
        json={"question": "What causes ERR_7034_SOCKET_TIMEOUT?"},
    )
    assert resp.status_code == 200
    data = resp.json()

    assert "answer" in data
    assert len(data["citations"]) >= 1

    retrieval = data["retrieval"]
    assert retrieval["result_count"] >= 1
    assert retrieval["retrieval_strategy"] == "hybrid"
    assert retrieval["reranked"] is True


@pytest.mark.asyncio
async def test_conversational_followup_with_coreference(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    user_id, token = await _register_user(client, "adv_user2@example.com")

    content = (
        "Microservices Architecture Guide.\n\n"
        "Service Mesh utilizes Envoy Proxy for east-west traffic encryption.\n"
        "The proxy automatically rotates mTLS certificates every 24 hours."
    )
    await _setup_ready_document(client, db_session, user_id, token, "mesh.txt", content)

    # 1. First turn establishing topic
    first_resp = await client.post(
        "/api/v1/chat/query",
        headers=_auth(token),
        json={"question": "What proxy is used by Service Mesh?"},
    )
    assert first_resp.status_code == 200
    conv_id = first_resp.json()["conversation_id"]

    # 2. Follow-up query using anaphoric pronoun "it"
    followup_resp = await client.post(
        "/api/v1/chat/query",
        headers=_auth(token),
        json={
            "question": "How often does it rotate certificates?",
            "conversation_id": conv_id,
        },
    )
    assert followup_resp.status_code == 200
    followup_data = followup_resp.json()

    assert followup_data["conversation_id"] == conv_id
    assert len(followup_data["citations"]) >= 1
    assert any(
        "24 hours" in c["snippet"] or "Envoy" in c["snippet"] for c in followup_data["citations"]
    )
