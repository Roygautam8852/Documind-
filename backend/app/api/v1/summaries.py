"""API endpoints for document summarization and multi-document comparison."""

from __future__ import annotations

import logging

from fastapi import APIRouter, Request, status

from app.api.dependencies import CurrentUserId, DbSession
from app.schemas.summaries import (
    DocumentSummaryRequest,
    DocumentSummaryResponse,
    MultiDocComparisonRequest,
    MultiDocComparisonResponse,
)
from app.services.summary_service import SummaryService

router = APIRouter(prefix="/summaries", tags=["summaries"])
logger = logging.getLogger(__name__)


@router.post(
    "/documents/{document_id}",
    response_model=DocumentSummaryResponse,
    status_code=status.HTTP_200_OK,
    summary="Generate a summary of a single document",
)
async def summarize_document(
    document_id: str,
    payload: DocumentSummaryRequest,
    current_user_id: CurrentUserId,
    db: DbSession,
    request: Request,
) -> DocumentSummaryResponse:
    """Generate a structured, source-cited summary of the specified document."""
    request_id = getattr(request.state, "request_id", "")
    service = SummaryService()
    return await service.summarize_document(
        db=db,
        user_id=current_user_id,
        document_id=document_id,
        summary_type=payload.summary_type,
        focus=payload.focus,
        conversation_id=payload.conversation_id,
        request_id=request_id,
    )


@router.post(
    "/compare",
    response_model=MultiDocComparisonResponse,
    status_code=status.HTTP_200_OK,
    summary="Compare and synthesize multiple documents",
)
async def compare_documents(
    payload: MultiDocComparisonRequest,
    current_user_id: CurrentUserId,
    db: DbSession,
    request: Request,
) -> MultiDocComparisonResponse:
    """Generate a comparative analysis across 2 to 10 user documents with citations."""
    request_id = getattr(request.state, "request_id", "")
    service = SummaryService()
    return await service.compare_documents(
        db=db,
        user_id=current_user_id,
        document_ids=payload.document_ids,
        focus=payload.focus,
        conversation_id=payload.conversation_id,
        request_id=request_id,
    )
