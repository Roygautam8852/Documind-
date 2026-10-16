"""Abstention evaluation and response generation when evidence is insufficient."""

from __future__ import annotations

from app.providers.vector_store.base import VectorSearchResult
from app.schemas.chat import ChatQueryResponse, RetrievalMeta

ABSTENTION_MESSAGE = (
    "The uploaded documents do not contain sufficient information to answer this question."
)


def should_abstain(
    results: list[VectorSearchResult],
    similarity_threshold: float = 0.35,
) -> bool:
    """Determine whether the pipeline should abstain from answering.

    Abstains if:
    1. No results were retrieved from the vector store.
    2. No retrieved chunk meets or exceeds the similarity_threshold.
    """
    if not results:
        return True

    # Check if at least one chunk satisfies the threshold
    highest_score = max(r.score for r in results)
    return highest_score < similarity_threshold


def create_abstention_response(
    request_id: str = "",
    conversation_id: str | None = None,
) -> ChatQueryResponse:
    """Build a standard 200 OK abstention response with zero citations."""
    return ChatQueryResponse(
        answer=ABSTENTION_MESSAGE,
        citations=[],
        retrieval=RetrievalMeta(result_count=0),
        conversation_id=conversation_id,
        request_id=request_id,
    )
