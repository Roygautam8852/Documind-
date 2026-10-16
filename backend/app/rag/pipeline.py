"""End-to-end RAG query pipeline orchestrator."""

from __future__ import annotations

import logging
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, get_settings
from app.core.exceptions import DocumentNotReadyError, NotFoundError
from app.models.conversation import Conversation
from app.models.document import Document
from app.models.message import Message
from app.providers.embeddings.factory import get_embedding_provider
from app.providers.llm.factory import get_llm_provider
from app.providers.vector_store.factory import get_vector_store
from app.rag.abstention import ABSTENTION_MESSAGE, should_abstain
from app.rag.citation_service import CitationService
from app.rag.prompt_builder import PromptBuilder
from app.schemas.chat import ChatQueryResponse, CitationItem, RetrievalMeta

logger = logging.getLogger(__name__)


async def query_rag(
    db: AsyncSession,
    user_id: str,
    question: str,
    document_ids: list[str] | None = None,
    conversation_id: str | None = None,
    request_id: str = "",
    settings: Settings | None = None,
) -> ChatQueryResponse:
    """Execute the full RAG pipeline for a user query.

    Stages:
    0. Resolve or create conversation thread and load recent history.
    1. Validate document accessibility and ready status.
    2. Embed the question into vector space.
    3. Retrieve relevant chunks with multi-tenant filtering.
    4. Abstain if evidence is insufficient or below similarity threshold.
    5. Construct structured prompt with assigned source IDs and conversation context.
    6. Generate completion via the configured LLM provider.
    7. Validate citation markers against retrieved evidence.
    8. Persist conversation turn (user + assistant) to database.
    9. Return grounded response with source citations and conversation_id.
    """
    cfg = settings or get_settings()
    vector_store = get_vector_store(cfg)
    embedding_provider = get_embedding_provider(cfg)
    llm_provider = get_llm_provider(cfg)

    # 0. Resolve or create conversation thread
    conversation: Conversation
    if conversation_id:
        conv_res = await db.execute(
            select(Conversation).where(
                Conversation.id == conversation_id,
                Conversation.owner_id == user_id,
            )
        )
        existing_conv = conv_res.scalar_one_or_none()
        if not existing_conv:
            raise NotFoundError(message="Conversation not found.")
        conversation = existing_conv
    else:
        first_line = question.strip().split("\n")[0][:60].strip()
        conversation = Conversation(
            owner_id=user_id,
            title=first_line or "New Conversation",
        )
        db.add(conversation)
        await db.flush()

    # Load recent conversation history (up to last 6 messages)
    msg_res = await db.execute(
        select(Message)
        .where(Message.conversation_id == conversation.id)
        .order_by(Message.created_at.desc())
        .limit(6)
    )
    recent_msgs = list(reversed(msg_res.scalars().all()))
    history_messages = [(m.role, m.content) for m in recent_msgs]

    async def _persist_and_respond(
        ans: str,
        citations_list: list[CitationItem],
        result_count: int,
    ) -> ChatQueryResponse:
        user_msg = Message(
            conversation_id=conversation.id,
            owner_id=user_id,
            role="user",
            content=question,
            citations=[],
            retrieval_metadata=None,
        )
        asst_msg = Message(
            conversation_id=conversation.id,
            owner_id=user_id,
            role="assistant",
            content=ans,
            citations=[c.model_dump() for c in citations_list],
            retrieval_metadata={"result_count": result_count},
        )
        db.add_all([user_msg, asst_msg])
        conversation.updated_at = datetime.now(timezone.utc)
        await db.commit()

        return ChatQueryResponse(
            answer=ans,
            citations=citations_list,
            retrieval=RetrievalMeta(result_count=result_count),
            conversation_id=conversation.id,
            request_id=request_id,
        )

    # 1. Document validation & filename resolution
    doc_filename_map: dict[str, str] = {}
    filter_doc_ids: list[str] | None = None

    if document_ids:
        # Validate specifically requested document IDs
        unique_requested_ids = list(dict.fromkeys(document_ids))
        res = await db.execute(
            select(Document).where(
                Document.id.in_(unique_requested_ids),
                Document.owner_id == user_id,
            )
        )
        found_docs = list(res.scalars().all())

        if len(found_docs) != len(unique_requested_ids):
            raise NotFoundError(message="One or more requested documents were not found.")

        for doc in found_docs:
            if doc.status != "ready":
                raise DocumentNotReadyError(
                    message=f"Document '{doc.original_filename}' is not ready for querying."
                )
            doc_filename_map[doc.id] = doc.original_filename

        filter_doc_ids = unique_requested_ids
    else:
        # Query across all ready documents owned by user
        res = await db.execute(
            select(Document).where(
                Document.owner_id == user_id,
                Document.status == "ready",
            )
        )
        ready_docs = list(res.scalars().all())
        if not ready_docs:
            # User has no ready documents to search
            return await _persist_and_respond(
                ans=ABSTENTION_MESSAGE,
                citations_list=[],
                result_count=0,
            )

        for doc in ready_docs:
            doc_filename_map[doc.id] = doc.original_filename
        filter_doc_ids = list(doc_filename_map.keys())

    # 2. Embed question
    query_vector = await embedding_provider.embed_query(question)

    # 3. Retrieve chunks from vector store
    results = await vector_store.query_similarity(
        query_vector=query_vector,
        owner_id=user_id,
        document_ids=filter_doc_ids,
        top_k=cfg.top_k,
        score_threshold=cfg.similarity_threshold,
    )

    # 4. Abstention check: if no chunks or none meet threshold
    if should_abstain(results, cfg.similarity_threshold):
        logger.info(
            "Abstaining on query: user=%s result_count=%d threshold=%.2f",
            user_id,
            len(results),
            cfg.similarity_threshold,
        )
        return await _persist_and_respond(
            ans=ABSTENTION_MESSAGE,
            citations_list=[],
            result_count=len(results),
        )

    # 5. Build prompt with source IDs and conversation context
    chunks_with_filenames = [(r, doc_filename_map.get(r.document_id, "document")) for r in results]
    evidence = PromptBuilder.build_evidence(chunks_with_filenames)
    system_prompt = PromptBuilder.get_system_prompt()
    user_prompt = PromptBuilder.build_user_prompt(
        question=question,
        evidence_text=evidence.evidence_text,
        conversation_history=history_messages if history_messages else None,
    )

    # 6. Generate answer with LLM
    raw_answer = await llm_provider.generate(
        prompt=user_prompt,
        system_prompt=system_prompt,
    )

    # 7. Validate citations
    if ABSTENTION_MESSAGE in raw_answer:
        validated_citations: list[CitationItem] = []
    else:
        validated_citations = CitationService.validate_citations(
            answer=raw_answer,
            source_map=evidence.source_map,
        )

    logger.info(
        "RAG query completed: user=%s chunks=%d citations=%d conversation=%s",
        user_id,
        len(results),
        len(validated_citations),
        conversation.id,
    )

    # 8. Persist and return response
    return await _persist_and_respond(
        ans=raw_answer,
        citations_list=validated_citations,
        result_count=len(results),
    )
