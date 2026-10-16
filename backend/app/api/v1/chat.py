"""Chat and RAG query API endpoints."""

from __future__ import annotations

import logging

from fastapi import APIRouter, Request, status

from app.api.dependencies import CurrentUserId, DbSession
from app.rag.pipeline import query_rag
from app.schemas.chat import ChatQueryRequest, ChatQueryResponse
from app.schemas.summaries import DocumentSummaryRequest, DocumentSummaryResponse
from app.services.summary_service import SummaryService

router = APIRouter(prefix="/chat", tags=["chat"])
logger = logging.getLogger(__name__)


@router.post(
    "/query",
    response_model=ChatQueryResponse,
    status_code=status.HTTP_200_OK,
    summary="Query documents using Retrieval-Augmented Generation",
)
async def query_documents(
    payload: ChatQueryRequest,
    current_user_id: CurrentUserId,
    db: DbSession,
    request: Request,
) -> ChatQueryResponse:
    """Execute a grounded RAG query across user documents with source citations."""
    request_id = getattr(request.state, "request_id", "")
    return await query_rag(
        db=db,
        user_id=current_user_id,
        question=payload.question,
        document_ids=payload.document_ids,
        conversation_id=payload.conversation_id,
        request_id=request_id,
    )


@router.post(
    "/summarize/{document_id}",
    response_model=DocumentSummaryResponse,
    status_code=status.HTTP_200_OK,
    summary="Generate a summary of the specified document",
)
async def summarize_document_chat(
    document_id: str,
    payload: DocumentSummaryRequest,
    current_user_id: CurrentUserId,
    db: DbSession,
    request: Request,
) -> DocumentSummaryResponse:
    """Generate a summary of the specified document conforming to API_SPEC.md."""
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
