"""Pydantic schemas for Conversation and Message endpoints."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field

from app.schemas.chat import CitationItem


class MessageResponse(BaseModel):
    """Schema for a single message in a conversation."""

    id: str = Field(..., description="Unique message ID")
    conversation_id: str = Field(..., description="ID of parent conversation")
    role: str = Field(..., description="Message sender role ('user' or 'assistant')")
    content: str = Field(..., description="Message body")
    citations: list[CitationItem] = Field(
        default_factory=list,
        description="Source citations associated with this message",
    )
    retrieval_metadata: dict[str, Any] | None = Field(
        default=None,
        description="Retrieval metrics and debugging metadata",
    )
    created_at: datetime = Field(..., description="Timestamp message was created")

    model_config = {"from_attributes": True}


class ConversationSummary(BaseModel):
    """Schema for conversation summary in lists."""

    id: str = Field(..., description="Unique conversation ID")
    title: str | None = Field(default=None, description="Conversation thread title")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")
    message_count: int = Field(default=0, description="Total number of messages in thread")

    model_config = {"from_attributes": True}


class ConversationDetailResponse(BaseModel):
    """Detailed conversation response including chronological message history."""

    id: str = Field(..., description="Unique conversation ID")
    title: str | None = Field(default=None, description="Conversation thread title")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")
    messages: list[MessageResponse] = Field(
        default_factory=list,
        description="Chronological conversation message history",
    )

    model_config = {"from_attributes": True}


class ConversationUpdateTitle(BaseModel):
    """Payload to rename conversation title."""

    title: str = Field(..., min_length=1, max_length=512, description="New conversation title")
