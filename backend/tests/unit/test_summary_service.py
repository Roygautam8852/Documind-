"""Unit tests for SummaryService (single-doc summarization & multi-doc comparison)."""

from __future__ import annotations

from pathlib import Path

import app.providers.embeddings.factory as emb_factory
import app.providers.llm.factory as llm_factory
import app.providers.vector_store.factory as vs_factory
import pytest
from app.core.config import get_settings
from app.core.exceptions import (
    DocumentNotFoundError,
    DocumentNotReadyError,
    NotFoundError,
    ValidationError,
)
from app.models.chunk import Chunk
from app.models.conversation import Conversation
from app.models.document import Document
from app.models.message import Message
from app.models.user import User
from app.providers.llm.mock_llm import MockLLMProvider
from app.services.summary_service import SummaryService
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession


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


async def _create_test_user(db: AsyncSession, email: str) -> User:
    user = User(email=email, password_hash="hashed_pw_test")
    db.add(user)
    await db.flush()
    return user


async def _create_test_doc_with_chunks(
    db: AsyncSession,
    user_id: str,
    filename: str,
    status: str = "ready",
    chunk_texts: list[str] | None = None,
) -> Document:
    doc = Document(
        owner_id=user_id,
        original_filename=filename,
        stored_object_key=f"storage_{filename}_{user_id}",
        mime_type="text/plain",
        size_bytes=1024,
        checksum_sha256="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        status=status,
    )
    db.add(doc)
    await db.flush()

    if chunk_texts:
        for idx, text in enumerate(chunk_texts):
            chunk = Chunk(
                document_id=doc.id,
                owner_id=user_id,
                chunk_index=idx,
                text=text,
                page_number=idx + 1,
                chunk_metadata={"doc_name": filename},
            )
            db.add(chunk)
        await db.flush()

    await db.commit()
    return doc


@pytest.mark.asyncio
async def test_summarize_document_executive(db_session: AsyncSession) -> None:
    user = await _create_test_user(db_session, "sum_exec@example.com")
    doc = await _create_test_doc_with_chunks(
        db_session,
        user.id,
        "spec.txt",
        status="ready",
        chunk_texts=[
            "DocuMind provides AI-powered document intelligence and hybrid retrieval.",
            "All retrieved answers are strictly backed by source citations.",
        ],
    )

    service = SummaryService(llm_provider=MockLLMProvider())
    resp = await service.summarize_document(
        db=db_session,
        user_id=user.id,
        document_id=doc.id,
        summary_type="executive",
    )

    assert resp.document_id == doc.id
    assert resp.filename == "spec.txt"
    assert resp.summary_type == "executive"
    assert "Executive Summary" in resp.summary
    assert len(resp.citations) >= 1
    assert resp.citations[0].filename == "spec.txt"
    assert resp.total_chunks_processed == 2


@pytest.mark.asyncio
async def test_summarize_document_styles(db_session: AsyncSession) -> None:
    user = await _create_test_user(db_session, "sum_styles@example.com")
    doc = await _create_test_doc_with_chunks(
        db_session,
        user.id,
        "guide.txt",
        status="ready",
        chunk_texts=["First section content.", "Second section content."],
    )

    service = SummaryService(llm_provider=MockLLMProvider())

    # Detailed style
    det_resp = await service.summarize_document(
        db=db_session,
        user_id=user.id,
        document_id=doc.id,
        summary_type="detailed",
    )
    assert det_resp.summary_type == "detailed"
    assert "Detailed Breakdown" in det_resp.summary

    # Bullet points style
    bp_resp = await service.summarize_document(
        db=db_session,
        user_id=user.id,
        document_id=doc.id,
        summary_type="bullet_points",
    )
    assert bp_resp.summary_type == "bullet_points"
    assert "Key Takeaways" in bp_resp.summary


@pytest.mark.asyncio
async def test_summarize_document_with_focus(db_session: AsyncSession) -> None:
    user = await _create_test_user(db_session, "sum_focus@example.com")
    doc = await _create_test_doc_with_chunks(
        db_session,
        user.id,
        "financials.txt",
        status="ready",
        chunk_texts=["Quarterly revenue exceeded forecasts by fifteen percent."],
    )

    service = SummaryService(llm_provider=MockLLMProvider())
    resp = await service.summarize_document(
        db=db_session,
        user_id=user.id,
        document_id=doc.id,
        focus="revenue and forecasts",
    )
    assert resp.document_id == doc.id
    assert len(resp.citations) > 0


@pytest.mark.asyncio
async def test_summarize_document_with_conversation(db_session: AsyncSession) -> None:
    user = await _create_test_user(db_session, "sum_conv@example.com")
    doc = await _create_test_doc_with_chunks(
        db_session,
        user.id,
        "report.txt",
        status="ready",
        chunk_texts=["Annual report details operational highlights and growth."],
    )

    conv = Conversation(owner_id=user.id, title="Doc Summary Thread")
    db_session.add(conv)
    await db_session.commit()

    service = SummaryService(llm_provider=MockLLMProvider())
    resp = await service.summarize_document(
        db=db_session,
        user_id=user.id,
        document_id=doc.id,
        conversation_id=conv.id,
    )
    assert resp.conversation_id == conv.id

    # Verify messages saved
    msg_res = await db_session.execute(
        select(Message).where(Message.conversation_id == conv.id).order_by(Message.created_at.asc())
    )
    messages = list(msg_res.scalars().all())
    assert len(messages) == 2
    assert messages[0].role == "user"
    assert "report.txt" in messages[0].content
    assert messages[1].role == "assistant"
    assert len(messages[1].citations) >= 1


@pytest.mark.asyncio
async def test_summarize_document_not_found(db_session: AsyncSession) -> None:
    user = await _create_test_user(db_session, "sum_nf@example.com")
    service = SummaryService(llm_provider=MockLLMProvider())
    with pytest.raises(DocumentNotFoundError):
        await service.summarize_document(
            db=db_session,
            user_id=user.id,
            document_id="00000000-0000-0000-0000-000000000000",
        )


@pytest.mark.asyncio
async def test_summarize_document_not_ready(db_session: AsyncSession) -> None:
    user = await _create_test_user(db_session, "sum_nr@example.com")
    doc = await _create_test_doc_with_chunks(
        db_session,
        user.id,
        "unprocessed.txt",
        status="uploaded",
        chunk_texts=[],
    )
    service = SummaryService(llm_provider=MockLLMProvider())
    with pytest.raises(DocumentNotReadyError):
        await service.summarize_document(
            db=db_session,
            user_id=user.id,
            document_id=doc.id,
        )


@pytest.mark.asyncio
async def test_summarize_document_multi_tenant_isolation(db_session: AsyncSession) -> None:
    user_a = await _create_test_user(db_session, "sum_iso_user_a@example.com")
    user_b = await _create_test_user(db_session, "sum_iso_user_b@example.com")

    doc_a = await _create_test_doc_with_chunks(
        db_session,
        user_a.id,
        "secret_a.txt",
        status="ready",
        chunk_texts=["Confidential corporate data for user A."],
    )

    service = SummaryService(llm_provider=MockLLMProvider())
    # User B should NOT be able to access User A's document
    with pytest.raises(DocumentNotFoundError):
        await service.summarize_document(
            db=db_session,
            user_id=user_b.id,
            document_id=doc_a.id,
        )


@pytest.mark.asyncio
async def test_compare_documents_success(db_session: AsyncSession) -> None:
    user = await _create_test_user(db_session, "compare_user@example.com")
    doc1 = await _create_test_doc_with_chunks(
        db_session,
        user.id,
        "q1_earnings.txt",
        status="ready",
        chunk_texts=["Q1 revenue was ten million with forty percent margins."],
    )
    doc2 = await _create_test_doc_with_chunks(
        db_session,
        user.id,
        "q2_earnings.txt",
        status="ready",
        chunk_texts=["Q2 revenue increased to twelve million with forty-five percent margins."],
    )

    service = SummaryService(llm_provider=MockLLMProvider())
    resp = await service.compare_documents(
        db=db_session,
        user_id=user.id,
        document_ids=[doc1.id, doc2.id],
        focus="revenue and margin trajectory",
    )

    assert len(resp.document_ids) == 2
    assert "Cross-Document Comparison" in resp.comparison
    assert len(resp.documents_compared) == 2
    assert len(resp.citations) >= 1


@pytest.mark.asyncio
async def test_compare_documents_validation(db_session: AsyncSession) -> None:
    user = await _create_test_user(db_session, "comp_val@example.com")
    service = SummaryService(llm_provider=MockLLMProvider())

    # Less than 2 documents
    with pytest.raises(ValidationError):
        await service.compare_documents(
            db=db_session,
            user_id=user.id,
            document_ids=["doc_1"],
        )

    # Duplicate IDs resulting in < 2 unique documents
    with pytest.raises(ValidationError):
        await service.compare_documents(
            db=db_session,
            user_id=user.id,
            document_ids=["doc_1", "doc_1"],
        )


@pytest.mark.asyncio
async def test_compare_documents_multi_tenant_isolation(db_session: AsyncSession) -> None:
    user_a = await _create_test_user(db_session, "comp_iso_user_a@example.com")
    user_b = await _create_test_user(db_session, "comp_iso_user_b@example.com")

    doc_a = await _create_test_doc_with_chunks(
        db_session,
        user_a.id,
        "doc_a.txt",
        status="ready",
        chunk_texts=["Document A secret content."],
    )
    doc_b = await _create_test_doc_with_chunks(
        db_session,
        user_b.id,
        "doc_b.txt",
        status="ready",
        chunk_texts=["Document B public content."],
    )

    service = SummaryService(llm_provider=MockLLMProvider())
    # User B tries to compare their doc with User A's doc -> 404
    with pytest.raises(NotFoundError):
        await service.compare_documents(
            db=db_session,
            user_id=user_b.id,
            document_ids=[doc_b.id, doc_a.id],
        )
