"""Pydantic schemas for document summarization and multi-document comparison."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

from app.schemas.chat import CitationItem

SummaryType = Literal["executive", "detailed", "bullet_points"]


class DocumentSummaryRequest(BaseModel):
    """Request payload for single-document summarization."""

    summary_type: SummaryType = Field(
        default="executive",
        description="Style of summary to generate: 'executive', 'detailed', or 'bullet_points'",
    )
    focus: str | None = Field(
        default=None,
        max_length=500,
        description="Optional aspect, topic, or question to focus the summary on",
    )
    conversation_id: str | None = Field(
        default=None,
        description="Optional conversation thread ID to append the summary turn to",
    )


class DocumentSummaryResponse(BaseModel):
    """Response payload for single-document summarization."""

    document_id: str = Field(..., description="UUID of summarized document")
    filename: str = Field(..., description="Filename of summarized document")
    summary_type: SummaryType = Field(..., description="Summary style used")
    summary: str = Field(..., description="Grounded generated summary text")
    citations: list[CitationItem] = Field(
        default_factory=list,
        description="Server-validated citations supporting statements in the summary",
    )
    total_chunks_processed: int = Field(
        ...,
        description="Number of document chunks included in summary context",
    )
    conversation_id: str | None = Field(
        default=None,
        description="Conversation thread ID if recorded",
    )
    request_id: str = Field(default="", description="Request tracing UUID")


class MultiDocComparisonRequest(BaseModel):
    """Request payload for comparing 2 to 10 documents."""

    document_ids: list[str] = Field(
        ...,
        min_length=2,
        max_length=10,
        description="List of 2 to 10 document IDs to compare and synthesize",
    )
    focus: str | None = Field(
        default=None,
        max_length=500,
        description="Optional topic or dimension to guide the comparison",
    )
    conversation_id: str | None = Field(
        default=None,
        description="Optional conversation thread ID to append the comparison turn to",
    )


class ComparedDocumentItem(BaseModel):
    """Metadata item for a document included in multi-doc comparison."""

    document_id: str = Field(..., description="Document UUID")
    filename: str = Field(..., description="Original upload filename")


class MultiDocComparisonResponse(BaseModel):
    """Response payload for multi-document comparison and synthesis."""

    document_ids: list[str] = Field(..., description="List of compared document IDs")
    focus: str | None = Field(
        default=None,
        description="Optional comparison focus topic applied",
    )
    comparison: str = Field(..., description="Grounded cross-document comparison text")
    documents_compared: list[ComparedDocumentItem] = Field(
        default_factory=list,
        description="Metadata of all documents compared",
    )
    citations: list[CitationItem] = Field(
        default_factory=list,
        description="Server-validated citations supporting the comparison across documents",
    )
    conversation_id: str | None = Field(
        default=None,
        description="Conversation thread ID if recorded",
    )
    request_id: str = Field(default="", description="Request tracing UUID")
