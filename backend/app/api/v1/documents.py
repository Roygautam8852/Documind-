"""Document API endpoints.

POST   /documents          — Upload a document
GET    /documents          — List user's documents (paginated)
GET    /documents/{id}     — Get document metadata
DELETE /documents/{id}     — Delete a document
POST   /documents/{id}/retry — Retry a failed ingestion

All endpoints are scoped to the authenticated user — users can only
operate on their own documents (owner_id == current_user_id).
"""

from __future__ import annotations

import io
import logging
import zipfile

from fastapi import APIRouter, UploadFile, status
from sqlalchemy import func, select

from app.api.dependencies import CurrentUserId, DbSession, Pagination
from app.core.config import get_settings
from app.core.exceptions import (
    DocumentNotReadyError,
    FileTooLargeError,
    MalformedFileError,
    NotFoundError,
    StorageQuotaExceededError,
    UnsupportedFileTypeError,
)
from app.models.document import Document
from app.providers.vector_store.factory import get_vector_store
from app.schemas.documents import DocumentListResponse, DocumentResponse, DocumentUploadResponse
from app.services import ingestion_service
from app.services.storage_service import compute_sha256, delete_file, save_upload

router = APIRouter(prefix="/documents", tags=["documents"])
logger = logging.getLogger(__name__)

# ── MIME type registry ──────────────────────────────────────────────────────────

_MIME_TYPES: dict[str, str] = {
    "pdf": "application/pdf",
    "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "txt": "text/plain",
}

_ALLOWED_CONTENT_TYPES = set(_MIME_TYPES.values()) | {
    "application/msword",  # legacy .doc (rejected below, just for detection)
}


# ── Endpoints ──────────────────────────────────────────────────────────────────


@router.post(
    "",
    response_model=DocumentUploadResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Upload a document for ingestion",
)
async def upload_document(
    file: UploadFile,
    current_user_id: CurrentUserId,
    db: DbSession,
) -> DocumentUploadResponse:
    """Accept a file upload, validate it, persist it, and start background ingestion.

    Accepted formats: PDF, DOCX, TXT.
    Max size is controlled by the ``MAX_UPLOAD_MB`` setting.
    Returns 202 immediately; poll ``GET /documents/{id}`` for ingestion status.
    """
    settings = get_settings()

    # 1. Extension check (fast path before reading the body)
    original_filename = file.filename or "upload"
    extension = original_filename.rsplit(".", 1)[-1].lower() if "." in original_filename else ""
    if extension not in settings.allowed_extensions_set:
        allowed = ", ".join(sorted(settings.allowed_extensions_set))
        raise UnsupportedFileTypeError(
            message=f"File type '.{extension}' is not supported. Allowed: {allowed}"
        )

    # Check per-user count before accepting the upload, then read at most limit + 1 bytes.
    doc_count, used_bytes = (
        await db.execute(
            select(func.count(Document.id), func.coalesce(func.sum(Document.size_bytes), 0)).where(
                Document.owner_id == current_user_id
            )
        )
    ).one()
    if doc_count >= settings.max_user_documents:
        raise StorageQuotaExceededError()

    content = await file.read(settings.max_upload_bytes + 1)
    if len(content) > settings.max_upload_bytes:
        size_mb = len(content) / 1_048_576
        msg = f"File exceeds the {settings.max_upload_mb} MB limit ({size_mb:.1f} MB uploaded)."
        raise FileTooLargeError(message=msg)
    if len(content) == 0:
        raise MalformedFileError(message="Uploaded file is empty.")

    storage_limit = settings.max_user_storage_mb * 1024 * 1024
    if used_bytes + len(content) > storage_limit:
        raise StorageQuotaExceededError(
            message=(
                "This upload would exceed your document storage quota. "
                "Delete a document before uploading."
            )
        )

    _validate_file_content(extension, content)

    # MIME type is assigned only after validating the corresponding file signature.
    mime_type = _MIME_TYPES.get(extension, "application/octet-stream")

    # 4. Compute checksum
    checksum = compute_sha256(content)

    # 5. Create DB record first to get the document ID for the storage key
    doc = Document(
        owner_id=current_user_id,
        original_filename=original_filename,
        stored_object_key="",  # filled after we know the doc ID
        mime_type=mime_type,
        size_bytes=len(content),
        checksum_sha256=checksum,
        status="uploaded",
    )
    db.add(doc)
    await db.flush()  # populates doc.id

    # 6. Save to storage (key includes doc.id for uniqueness)
    try:
        _, object_key = save_upload(
            content=content,
            owner_id=current_user_id,
            document_id=doc.id,
            original_filename=original_filename,
        )
    except OSError as exc:
        await db.rollback()
        raise MalformedFileError(message="Could not save the uploaded file.") from exc

    doc.stored_object_key = object_key
    await db.commit()
    await db.refresh(doc)

    logger.info(
        "Document uploaded: id=%s owner=%s size=%d",
        doc.id,
        current_user_id,
        len(content),
    )

    # 7. Schedule background ingestion (fire-and-forget)
    ingestion_service.schedule_ingestion(document_id=doc.id, owner_id=current_user_id)

    return DocumentUploadResponse(
        id=doc.id,
        original_filename=original_filename,
        status="uploaded",
        size_bytes=len(content),
    )


def _validate_file_content(extension: str, content: bytes) -> None:
    """Reject extension spoofing and malformed container files before storage."""
    if extension == "pdf":
        valid = content.startswith(b"%PDF-")
    elif extension == "docx":
        try:
            with zipfile.ZipFile(io.BytesIO(content)) as archive:
                names = set(archive.namelist())
                valid = "[Content_Types].xml" in names and "word/document.xml" in names
        except (zipfile.BadZipFile, OSError):
            valid = False
    else:
        try:
            content.decode("utf-8")
            valid = True
        except UnicodeDecodeError:
            valid = False

    if not valid:
        raise MalformedFileError(message="The uploaded file content does not match its file type.")


@router.get(
    "",
    response_model=DocumentListResponse,
    summary="List documents for the current user",
)
async def list_documents(
    current_user_id: CurrentUserId,
    db: DbSession,
    pagination: Pagination,
) -> DocumentListResponse:
    """Return a paginated list of the authenticated user's documents."""
    base_q = select(Document).where(Document.owner_id == current_user_id)

    total_result = await db.execute(select(func.count()).select_from(base_q.subquery()))
    total: int = total_result.scalar_one()

    docs_result = await db.execute(
        base_q.order_by(Document.created_at.desc())
        .offset((pagination.page - 1) * pagination.page_size)
        .limit(pagination.page_size)
    )
    docs = list(docs_result.scalars().all())

    return DocumentListResponse(
        items=[DocumentResponse.model_validate(d) for d in docs],
        total=total,
        page=pagination.page,
        page_size=pagination.page_size,
        has_more=(pagination.page * pagination.page_size) < total,
    )


@router.get(
    "/{document_id}",
    response_model=DocumentResponse,
    summary="Get document metadata and ingestion status",
)
async def get_document(
    document_id: str,
    current_user_id: CurrentUserId,
    db: DbSession,
) -> DocumentResponse:
    """Return metadata for a single document owned by the current user."""
    doc = await _get_owned_document(db, document_id, current_user_id)
    return DocumentResponse.model_validate(doc)


@router.delete(
    "/{document_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a document and all its chunks",
)
async def delete_document(
    document_id: str,
    current_user_id: CurrentUserId,
    db: DbSession,
) -> None:
    """Permanently delete a document, its stored file, and all associated chunks.

    Raises 409 if the document is currently being processed.
    """
    doc = await _get_owned_document(db, document_id, current_user_id)

    if doc.status == "processing":
        raise DocumentNotReadyError(
            message="The document is currently being processed. Please wait before deleting."
        )

    # Delete physical file (best-effort)
    if doc.stored_object_key:
        delete_file(doc.stored_object_key)

    # Delete vectors from vector store (best-effort)
    try:
        vector_store = get_vector_store()
        await vector_store.delete_document_vectors(document_id=doc.id, owner_id=current_user_id)
    except Exception as exc:
        logger.warning("Failed to delete vectors for document %s: %s", doc.id, exc)

    await db.delete(doc)
    logger.info("Document deleted: id=%s owner=%s", document_id, current_user_id)


@router.post(
    "/{document_id}/retry",
    response_model=DocumentResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Retry ingestion for a failed document",
)
async def retry_ingestion(
    document_id: str,
    current_user_id: CurrentUserId,
    db: DbSession,
) -> DocumentResponse:
    """Re-queue ingestion for a document in ``failed`` status.

    Raises 409 if the document is not in ``failed`` status.
    """
    doc = await _get_owned_document(db, document_id, current_user_id)

    if doc.status != "failed":
        msg = f"Only documents with status 'failed' can be retried. Current status: {doc.status!r}"
        raise DocumentNotReadyError(message=msg)

    # Reset status and clear previous error fields
    doc.status = "uploaded"
    doc.error_code = None
    doc.safe_error_message = None
    await db.commit()
    await db.refresh(doc)

    ingestion_service.schedule_ingestion(document_id=doc.id, owner_id=current_user_id)
    logger.info("Retry scheduled: document_id=%s", document_id)

    return DocumentResponse.model_validate(doc)


# ── Helpers ────────────────────────────────────────────────────────────────────


async def _get_owned_document(
    db: DbSession,
    document_id: str,
    owner_id: str,
) -> Document:
    """Fetch a document by ID and verify ownership.

    Raises:
        NotFoundError: If the document does not exist or belongs to another user.
    """
    result = await db.execute(
        select(Document).where(
            Document.id == document_id,
            Document.owner_id == owner_id,
        )
    )
    doc = result.scalar_one_or_none()
    if doc is None:
        raise NotFoundError(message="Document not found.")
    return doc
