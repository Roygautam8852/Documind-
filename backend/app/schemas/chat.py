"""Pydantic schemas for Chat and RAG query endpoints."""

from __future__ import annotations

from pydantic import BaseModel, Field


class ChatQueryRequest(BaseModel):
    """Request payload for POST /api/v1/chat/query."""

    question: str = Field(..., min_length=1, max_length=4000, description="User's query")
    document_ids: list[str] | None = Field(
        default=None,
        description="Optional list of document IDs to scope retrieval to",
    )
    conversation_id: str | None = Field(
        default=None,
        description="Optional conversation thread ID",
    )


class CitationItem(BaseModel):
    """A validated source citation mapped to an extracted document chunk."""

    citation_id: str = Field(..., description="Citation marker, e.g. S1")
    document_id: str = Field(..., description="UUID of source document")
    filename: str = Field(..., description="Original upload filename")
    page_number: int | None = Field(default=None, description="Page number if available")
    chunk_id: str = Field(..., description="UUID of source chunk")
    snippet: str = Field(..., description="Text excerpt supporting the citation")


class RetrievalMeta(BaseModel):
    """Metadata regarding retrieval execution."""

    result_count: int = Field(..., description="Number of evidence chunks retrieved")


class ChatQueryResponse(BaseModel):
    """Response payload for POST /api/v1/chat/query."""

    answer: str = Field(..., description="Generated or abstention answer")
    citations: list[CitationItem] = Field(
        default_factory=list,
        description="Server-validated citations supporting the answer",
    )
    retrieval: RetrievalMeta = Field(..., description="Retrieval statistics")
    conversation_id: str | None = Field(
        default=None,
        description="Active conversation thread ID",
    )
    request_id: str = Field(default="", description="Unique request tracing ID")
