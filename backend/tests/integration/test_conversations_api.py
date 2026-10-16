"""Integration tests for Conversations API and message history persistence."""

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
    """Helper to register user and return user_id + bearer token."""
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
    """Configure isolated environment for mock providers."""
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
async def test_conversations_empty_list(client: AsyncClient) -> None:
    _, token = await _register_user(client, "conv_user1@example.com")
    resp = await client.get("/api/v1/conversations", headers=_auth(token))
    assert resp.status_code == 200
    data = resp.json()
    assert data["items"] == []
    assert data["total"] == 0


@pytest.mark.asyncio
async def test_chat_query_creates_conversation_and_persists_messages(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    user_id, token = await _register_user(client, "conv_user2@example.com")
    await _setup_ready_document(
        client,
        db_session,
        user_id,
        token,
        "security_policy.txt",
        "Data encryption standard requires AES-256 for all stored data at rest.",
    )

    # 1. First query without conversation_id
    query_resp = await client.post(
        "/api/v1/chat/query",
        headers=_auth(token),
        json={"question": "What encryption standard is required for data at rest?"},
    )
    assert query_resp.status_code == 200
    body = query_resp.json()
    conv_id = body["conversation_id"]
    assert conv_id is not None
    assert len(body["citations"]) >= 1

    # 2. Verify conversation list has 1 thread
    list_resp = await client.get("/api/v1/conversations", headers=_auth(token))
    assert list_resp.status_code == 200
    list_data = list_resp.json()
    assert list_data["total"] == 1
    summary = list_data["items"][0]
    assert summary["id"] == conv_id
    assert summary["message_count"] == 2  # user + assistant

    # 3. Retrieve conversation details
    detail_resp = await client.get(f"/api/v1/conversations/{conv_id}", headers=_auth(token))
    assert detail_resp.status_code == 200
    detail = detail_resp.json()
    assert detail["id"] == conv_id
    assert len(detail["messages"]) == 2
    assert detail["messages"][0]["role"] == "user"
    assert "encryption standard" in detail["messages"][0]["content"]
    assert detail["messages"][1]["role"] == "assistant"
    assert len(detail["messages"][1]["citations"]) >= 1

    # 4. Send follow-up in the same conversation
    query_resp_2 = await client.post(
        "/api/v1/chat/query",
        headers=_auth(token),
        json={
            "question": "Does this policy apply to all stored data?",
            "conversation_id": conv_id,
        },
    )
    assert query_resp_2.status_code == 200
    assert query_resp_2.json()["conversation_id"] == conv_id

    # 5. Detail should now have 4 messages
    detail_resp_2 = await client.get(f"/api/v1/conversations/{conv_id}", headers=_auth(token))
    detail_2 = detail_resp_2.json()
    assert len(detail_2["messages"]) == 4


@pytest.mark.asyncio
async def test_update_and_delete_conversation(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    user_id, token = await _register_user(client, "conv_user3@example.com")
    await _setup_ready_document(
        client, db_session, user_id, token, "guide.txt", "DocuMind guide and documentation."
    )

    query_resp = await client.post(
        "/api/v1/chat/query",
        headers=_auth(token),
        json={"question": "Tell me about DocuMind."},
    )
    conv_id = query_resp.json()["conversation_id"]

    # Patch title
    patch_resp = await client.patch(
        f"/api/v1/conversations/{conv_id}",
        headers=_auth(token),
        json={"title": "Updated Architecture Thread"},
    )
    assert patch_resp.status_code == 200
    assert patch_resp.json()["title"] == "Updated Architecture Thread"

    # Delete conversation
    del_resp = await client.delete(f"/api/v1/conversations/{conv_id}", headers=_auth(token))
    assert del_resp.status_code == 204

    # Subsequent GET returns 404
    get_resp = await client.get(f"/api/v1/conversations/{conv_id}", headers=_auth(token))
    assert get_resp.status_code == 404


@pytest.mark.asyncio
async def test_conversation_multi_tenant_isolation(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    user_a_id, token_a = await _register_user(client, "conv_iso_user_a@example.com")
    _, token_b = await _register_user(client, "conv_iso_user_b@example.com")

    await _setup_ready_document(
        client,
        db_session,
        user_a_id,
        token_a,
        "alice_notes.txt",
        "Alice private notes on DocuMind RAG.",
    )

    # User A creates a conversation
    query_resp = await client.post(
        "/api/v1/chat/query",
        headers=_auth(token_a),
        json={"question": "What is in Alice notes?"},
    )
    conv_id = query_resp.json()["conversation_id"]

    # User B attempts to access User A's conversation
    get_resp = await client.get(f"/api/v1/conversations/{conv_id}", headers=_auth(token_b))
    assert get_resp.status_code == 404

    # User B attempts to update User A's conversation title
    patch_resp = await client.patch(
        f"/api/v1/conversations/{conv_id}",
        headers=_auth(token_b),
        json={"title": "Hacked Title"},
    )
    assert patch_resp.status_code == 404

    # User B attempts to delete User A's conversation
    del_resp = await client.delete(f"/api/v1/conversations/{conv_id}", headers=_auth(token_b))
    assert del_resp.status_code == 404

    # User B attempts to append a query into User A's conversation
    query_b_resp = await client.post(
        "/api/v1/chat/query",
        headers=_auth(token_b),
        json={"question": "Can I hijack this?", "conversation_id": conv_id},
    )
    assert query_b_resp.status_code == 404
