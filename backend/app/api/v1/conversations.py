"""Conversation management API endpoints."""

from __future__ import annotations

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Query, Response, status
from sqlalchemy import func, select

from app.api.dependencies import CurrentUserId, DbSession
from app.core.exceptions import NotFoundError
from app.models.conversation import Conversation
from app.models.message import Message
from app.schemas.chat import CitationItem
from app.schemas.common import PaginatedResponse
from app.schemas.conversations import (
    ConversationDetailResponse,
    ConversationSummary,
    ConversationUpdateTitle,
    MessageResponse,
)

router = APIRouter(prefix="/conversations", tags=["conversations"])
logger = logging.getLogger(__name__)


@router.get(
    "",
    response_model=PaginatedResponse[ConversationSummary],
    status_code=status.HTTP_200_OK,
    summary="List conversations",
)
async def list_conversations(
    current_user_id: CurrentUserId,
    db: DbSession,
    page: int = Query(default=1, ge=1, description="Page number"),
    page_size: int = Query(default=20, ge=1, le=100, description="Items per page"),
) -> PaginatedResponse[ConversationSummary]:
    """Return a paginated list of the current user's conversations ordered by last active."""
    count_stmt = select(func.count(Conversation.id)).where(Conversation.owner_id == current_user_id)
    total = (await db.execute(count_stmt)).scalar_one()

    # Subquery for message counts
    msg_count_subq = (
        select(func.count(Message.id))
        .where(Message.conversation_id == Conversation.id)
        .scalar_subquery()
    )

    query = (
        select(Conversation, msg_count_subq.label("message_count"))
        .where(Conversation.owner_id == current_user_id)
        .order_by(Conversation.updated_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )

    result = await db.execute(query)
    rows = result.all()

    items: list[ConversationSummary] = [
        ConversationSummary(
            id=conv.id,
            title=conv.title,
            created_at=conv.created_at,
            updated_at=conv.updated_at,
            message_count=count or 0,
        )
        for conv, count in rows
    ]

    return PaginatedResponse.from_items(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get(
    "/{conversation_id}",
    response_model=ConversationDetailResponse,
    status_code=status.HTTP_200_OK,
    summary="Get conversation details and message history",
)
async def get_conversation(
    conversation_id: str,
    current_user_id: CurrentUserId,
    db: DbSession,
) -> ConversationDetailResponse:
    """Retrieve a single conversation and its full chronological message history."""
    conv_stmt = select(Conversation).where(
        Conversation.id == conversation_id,
        Conversation.owner_id == current_user_id,
    )
    conv_res = await db.execute(conv_stmt)
    conv = conv_res.scalar_one_or_none()

    if not conv:
        raise NotFoundError(message="Conversation not found.")

    # Load messages chronologically
    msg_stmt = (
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.created_at.asc())
    )
    msg_res = await db.execute(msg_stmt)
    messages = list(msg_res.scalars().all())

    message_items = [
        MessageResponse(
            id=m.id,
            conversation_id=m.conversation_id,
            role=m.role,
            content=m.content,
            citations=[CitationItem(**c) for c in (m.citations or [])],
            retrieval_metadata=m.retrieval_metadata,
            created_at=m.created_at,
        )
        for m in messages
    ]

    return ConversationDetailResponse(
        id=conv.id,
        title=conv.title,
        created_at=conv.created_at,
        updated_at=conv.updated_at,
        messages=message_items,
    )


@router.patch(
    "/{conversation_id}",
    response_model=ConversationSummary,
    status_code=status.HTTP_200_OK,
    summary="Rename conversation title",
)
async def update_conversation_title(
    conversation_id: str,
    payload: ConversationUpdateTitle,
    current_user_id: CurrentUserId,
    db: DbSession,
) -> ConversationSummary:
    """Update the title of a conversation thread."""
    conv_stmt = select(Conversation).where(
        Conversation.id == conversation_id,
        Conversation.owner_id == current_user_id,
    )
    conv_res = await db.execute(conv_stmt)
    conv = conv_res.scalar_one_or_none()

    if not conv:
        raise NotFoundError(message="Conversation not found.")

    conv.title = payload.title.strip()
    conv.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(conv)

    msg_count_stmt = select(func.count(Message.id)).where(
        Message.conversation_id == conversation_id
    )
    count = (await db.execute(msg_count_stmt)).scalar_one()

    return ConversationSummary(
        id=conv.id,
        title=conv.title,
        created_at=conv.created_at,
        updated_at=conv.updated_at,
        message_count=count,
    )


@router.delete(
    "/{conversation_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete conversation thread",
)
async def delete_conversation(
    conversation_id: str,
    current_user_id: CurrentUserId,
    db: DbSession,
) -> Response:
    """Delete a conversation thread and cascade deletion to its messages."""
    conv_stmt = select(Conversation).where(
        Conversation.id == conversation_id,
        Conversation.owner_id == current_user_id,
    )
    conv_res = await db.execute(conv_stmt)
    conv = conv_res.scalar_one_or_none()

    if not conv:
        raise NotFoundError(message="Conversation not found.")

    await db.delete(conv)
    await db.commit()
    logger.info("Deleted conversation: id=%s user=%s", conversation_id, current_user_id)

    return Response(status_code=status.HTTP_204_NO_CONTENT)
