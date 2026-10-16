"""Document Pydantic schemas."""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel

# Valid document statuses
DocumentStatus = Literal["uploaded", "processing", "ready", "failed", "deleting"]


class DocumentResponse(BaseModel):
    """Document metadata returned by the API."""

    id: str
    owner_id: str
    original_filename: str
    mime_type: str
    size_bytes: int
    checksum_sha256: str
    status: DocumentStatus
    error_code: str | None = None
    safe_error_message: str | None = None
    page_count: int | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class DocumentListResponse(BaseModel):
    """Paginated list of documents."""

    items: list[DocumentResponse]
    total: int
    page: int
    page_size: int
    has_more: bool


class DocumentUploadResponse(BaseModel):
    """Immediate response after a successful upload (before ingestion completes)."""

    id: str
    original_filename: str
    status: DocumentStatus
    size_bytes: int
    message: str = "Document uploaded. Ingestion is running in the background."
