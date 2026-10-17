"""Document ingestion pipeline.

Orchestrates the full pipeline for a single document:
  uploaded → parsing → chunking → DB storage → ready

This runs as an asyncio background task so the upload endpoint
returns immediately while ingestion proceeds asynchronously.

Vector embedding (Phase 02) is called at the end of ingestion
but currently runs as a no-op stub.
"""

from __future__ import annotations

import asyncio
import logging
from pathlib import Path

from sqlalchemy import delete, select, update
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.db.session import get_session_factory
from app.models.chunk import Chunk
from app.models.document import Document
from app.parsers.base import ParsedDocument
from app.parsers.docx_parser import DocxParser
from app.parsers.pdf_parser import PdfParser
from app.parsers.txt_parser import TxtParser
from app.providers.embeddings.factory import get_embedding_provider
from app.providers.vector_store.factory import get_vector_store
from app.services.chunking_service import chunk_document_pages
from app.services.storage_service import resolve_path

logger = logging.getLogger(__name__)

# Parser registry — mime_type → parser instance
_PARSERS = {
    "application/pdf": PdfParser(),
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": DocxParser(),
    "application/msword": DocxParser(),
    "text/plain": TxtParser(),
}


# ── Public API ─────────────────────────────────────────────────────────────────


def schedule_ingestion(document_id: str, owner_id: str) -> None:
    """Schedule document ingestion as a fire-and-forget asyncio task.

    Must be called from within a running event loop (i.e. inside a request handler).
    """
    asyncio.create_task(
        _run_ingestion(document_id=document_id, owner_id=owner_id),
        name=f"ingest:{document_id}",
    )
    logger.info("Ingestion scheduled: document_id=%s", document_id)


# ── Internal pipeline ──────────────────────────────────────────────────────────


async def _run_ingestion(document_id: str, owner_id: str) -> None:
    """Execute the full ingestion pipeline for one document."""
    session_factory = get_session_factory()
    async with session_factory() as session:
        try:
            await _ingest(session, document_id, owner_id)
            await session.commit()
        except Exception as exc:
            await session.rollback()
            logger.exception(
                "Ingestion failed: document_id=%s error=%s",
                document_id,
                type(exc).__name__,
            )
            await _mark_failed(session_factory, document_id, str(type(exc).__name__))


async def _ingest(session: AsyncSession, document_id: str, owner_id: str) -> None:
    """Core ingestion logic within an open session."""
    # 1. Load document record (with retry loop in case transaction commit is propagating)
    doc = None
    for attempt in range(5):
        result = await session.execute(
            select(Document).where(Document.id == document_id, Document.owner_id == owner_id)
        )
        doc = result.scalar_one_or_none()
        if doc is not None:
            break
        await asyncio.sleep(0.15)

    if doc is None:
        logger.warning("Document not found for ingestion: %s", document_id)
        return

    # 2. Mark as processing
    doc.status = "processing"
    await session.flush()
    logger.info("Ingestion started: document_id=%s mime=%s", document_id, doc.mime_type)

    # 3. Parse
    file_path = resolve_path(doc.stored_object_key)
    parsed = _parse_document(file_path, doc.mime_type)

    # 4. Update page count
    doc.page_count = parsed.total_pages

    # 5. Chunk
    page_tuples = [(p.page_number, p.text) for p in parsed.pages]
    text_chunks = chunk_document_pages(page_tuples)

    if not text_chunks:
        logger.warning("No text extracted from document: %s", document_id)
        doc.status = "failed"
        doc.error_code = "no_text_extracted"
        doc.safe_error_message = "The document appears to contain no readable text."
        return

    # 6. Idempotency: purge any prior chunks & vectors for this document
    await session.execute(delete(Chunk).where(Chunk.document_id == document_id))
    vector_store = get_vector_store()
    await vector_store.delete_document_vectors(document_id=document_id, owner_id=owner_id)

    # 7. Persist chunks in DB
    chunk_models = [
        Chunk(
            document_id=document_id,
            owner_id=owner_id,
            chunk_index=tc.chunk_index,
            text=tc.text,
            page_number=tc.page_number,
            token_count=tc.token_count,
            chunk_metadata={"start_char": tc.start_char, "end_char": tc.end_char},
        )
        for tc in text_chunks
    ]
    session.add_all(chunk_models)
    await session.flush()

    logger.info(
        "Chunks stored: document_id=%s count=%d pages=%d",
        document_id,
        len(chunk_models),
        parsed.total_pages,
    )

    # 8. Vector embeddings & vector store indexing
    embedding_provider = get_embedding_provider()
    texts = [c.text for c in chunk_models]
    embeddings = await embedding_provider.embed_texts(texts)
    chunk_ids = [str(c.id) for c in chunk_models]
    metadatas = [
        {
            "page_number": c.page_number or 0,
            "chunk_index": c.chunk_index,
            "token_count": c.token_count or 0,
        }
        for c in chunk_models
    ]
    vector_ids = await vector_store.add_chunks(
        document_id=document_id,
        owner_id=owner_id,
        chunk_ids=chunk_ids,
        texts=texts,
        embeddings=embeddings,
        metadatas=metadatas,
    )
    for chunk_model, v_id in zip(chunk_models, vector_ids, strict=False):
        chunk_model.vector_id = v_id
    await session.flush()

    # 9. Mark ready
    doc.status = "ready"
    logger.info("Ingestion complete: document_id=%s", document_id)


def _parse_document(file_path: Path, mime_type: str) -> ParsedDocument:
    """Dispatch to the appropriate parser based on MIME type."""
    parser = _PARSERS.get(mime_type)
    if parser is None:
        raise ValueError(f"No parser registered for MIME type: {mime_type}")
    return parser.parse(file_path)


async def _mark_failed(
    session_factory: async_sessionmaker[AsyncSession],
    document_id: str,
    error_code: str,
) -> None:
    """Mark a document as failed in a fresh session (error recovery)."""
    async with session_factory() as session:
        await session.execute(
            update(Document)
            .where(Document.id == document_id)
            .values(
                status="failed",
                error_code=error_code,
                safe_error_message=(
                    "Document processing failed. Please try again or contact support."
                ),
            )
        )
        await session.commit()
