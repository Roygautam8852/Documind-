"""End-to-end RAG query pipeline orchestrator with advanced retrieval."""

from __future__ import annotations

import logging
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, get_settings
from app.core.exceptions import DocumentNotReadyError, NotFoundError
from app.models.chunk import Chunk
from app.models.conversation import Conversation
from app.models.document import Document
from app.models.message import Message
from app.providers.embeddings.factory import get_embedding_provider
from app.providers.llm.factory import get_llm_provider
from app.providers.reranker.factory import get_reranker
from app.providers.vector_store.base import VectorSearchResult
from app.providers.vector_store.factory import get_vector_store
from app.rag.abstention import ABSTENTION_MESSAGE, should_abstain
from app.rag.bm25 import BM25Retriever
from app.rag.citation_service import CitationService
from app.rag.fusion import reciprocal_rank_fusion
from app.rag.prompt_builder import PromptBuilder
from app.rag.query_reformulator import QueryReformulator
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
    0. Resolve/create conversation thread and load recent history.
    1. Validate document accessibility and ready status.
    2. Reformulate query if follow-up turn in a conversation.
    3. Retrieve chunks via dense vector search.
    4. Retrieve chunks via sparse BM25 lexical search (if hybrid enabled).
    5. Merge rankings using Reciprocal Rank Fusion (RRF).
    6. Apply cross-encoder reranking if configured.
    7. Abstain if evidence is insufficient or below similarity threshold.
    8. Construct structured prompt with assigned source IDs and conversation context.
    9. Generate completion via the configured LLM provider.
    10. Validate citation markers against retrieved evidence.
    11. Persist conversation turn (user + assistant) to database.
    12. Return grounded response with source citations and conversation_id.
    """
    cfg = settings or get_settings()
    vector_store = get_vector_store(cfg)
    embedding_provider = get_embedding_provider(cfg)
    llm_provider = get_llm_provider(cfg)
    reranker = get_reranker(cfg)

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
        retrieval_meta: RetrievalMeta,
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
            retrieval_metadata=retrieval_meta.model_dump(),
        )
        db.add_all([user_msg, asst_msg])
        conversation.updated_at = datetime.now(timezone.utc)
        await db.commit()

        return ChatQueryResponse(
            answer=ans,
            citations=citations_list,
            retrieval=retrieval_meta,
            conversation_id=conversation.id,
            request_id=request_id,
        )

    # 1. Document validation & filename resolution
    doc_filename_map: dict[str, str] = {}
    filter_doc_ids: list[str] | None = None

    if document_ids:
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
        effective_top_k = max(cfg.top_k, min(len(unique_requested_ids) * 3, 25))
    else:
        # All Documents scope: query across all ready documents for this user
        res = await db.execute(
            select(Document).where(
                Document.owner_id == user_id,
                Document.status == "ready",
            )
        )
        ready_docs = list(res.scalars().all())
        if not ready_docs:
            return await _persist_and_respond(
                ans=ABSTENTION_MESSAGE,
                citations_list=[],
                retrieval_meta=RetrievalMeta(
                    result_count=0,
                    retrieval_strategy="none",
                    dense_count=0,
                    lexical_count=0,
                    reranked=False,
                ),
            )

        for doc in ready_docs:
            doc_filename_map[doc.id] = doc.original_filename
        # Passing None searches across all documents belonging to owner_id
        filter_doc_ids = None
        effective_top_k = max(cfg.top_k, min(len(ready_docs) * 3, 25))

    # 2. Query reformulation (for conversational coreferences)
    search_query = question
    if cfg.query_reformulation_enabled and history_messages:
        search_query = QueryReformulator.reformulate(question, history_messages)

    # 3. Dense vector retrieval
    query_vector = await embedding_provider.embed_query(search_query)
    dense_results = await vector_store.query_similarity(
        query_vector=query_vector,
        owner_id=user_id,
        document_ids=filter_doc_ids,
        top_k=effective_top_k,
        score_threshold=cfg.similarity_threshold,
    )
    if dense_results:
        dense_results = [r for r in dense_results if r.document_id in doc_filename_map]

    # 4. Sparse lexical BM25 retrieval and Reciprocal Rank Fusion
    retrieval_strategy = "vector"
    lexical_results: list[VectorSearchResult] = []
    results: list[VectorSearchResult]

    if cfg.hybrid_search_enabled:
        retrieval_strategy = "hybrid"
        bm25_engine = BM25Retriever()
        lexical_results = await bm25_engine.search(
            db=db,
            query=search_query,
            owner_id=user_id,
            document_ids=filter_doc_ids,
            top_k=effective_top_k,
        )
        if lexical_results:
            lexical_results = [r for r in lexical_results if r.document_id in doc_filename_map]

        results = reciprocal_rank_fusion(
            dense_results=dense_results,
            lexical_results=lexical_results,
            k=cfg.hybrid_rrf_k,
            top_k=effective_top_k,
        )
    else:
        results = dense_results

    # 5. Pluggable reranking
    reranked_flag = False
    if reranker is not None and results:
        results = await reranker.rerank(
            query=search_query,
            candidates=results,
            top_k=effective_top_k,
        )
        reranked_flag = True

    retrieval_meta = RetrievalMeta(
        result_count=len(results),
        retrieval_strategy=retrieval_strategy,
        dense_count=len(dense_results),
        lexical_count=len(lexical_results),
        reranked=reranked_flag,
    )

    # 6. Abstention check with multi-document fallback
    if should_abstain(results, cfg.similarity_threshold):
        # Cross-document fallback: if a user asks a general question across all documents
        # or semantic similarity didn't exceed threshold, retrieve key chunks from each ready document
        valid_doc_ids = list(doc_filename_map.keys())
        fallback_stmt = (
            select(Chunk)
            .where(
                Chunk.owner_id == user_id,
                Chunk.document_id.in_(valid_doc_ids),
            )
            .order_by(Chunk.chunk_index)
            .limit(effective_top_k)
        )
        fb_res = await db.execute(fallback_stmt)
        fb_chunks = list(fb_res.scalars().all())

        if fb_chunks:
            results = [
                VectorSearchResult(
                    chunk_id=c.id,
                    document_id=c.document_id,
                    owner_id=c.owner_id,
                    text=c.text,
                    score=0.9,
                    page_number=c.page_number,
                    chunk_index=c.chunk_index,
                    metadata=dict(c.chunk_metadata or {}),
                )
                for c in fb_chunks
            ]
            retrieval_meta = RetrievalMeta(
                result_count=len(results),
                retrieval_strategy="multi_doc_context",
                dense_count=len(dense_results),
                lexical_count=len(lexical_results),
                reranked=False,
            )
        else:
            logger.info(
                "Abstaining on query: user=%s result_count=%d threshold=%.2f strategy=%s",
                user_id,
                len(results),
                cfg.similarity_threshold,
                retrieval_strategy,
            )
            return await _persist_and_respond(
                ans=ABSTENTION_MESSAGE,
                citations_list=[],
                retrieval_meta=retrieval_meta,
            )

    # 7. Build prompt with source IDs and conversation context
    chunks_with_filenames = [(r, doc_filename_map.get(r.document_id, "document")) for r in results]
    evidence = PromptBuilder.build_evidence(chunks_with_filenames)
    system_prompt = PromptBuilder.get_system_prompt()
    user_prompt = PromptBuilder.build_user_prompt(
        question=question,
        evidence_text=evidence.evidence_text,
        conversation_history=history_messages if history_messages else None,
    )

    # 8. Generate answer with LLM
    raw_answer = await llm_provider.generate(
        prompt=user_prompt,
        system_prompt=system_prompt,
    )

    # 9. Validate citations
    if ABSTENTION_MESSAGE in raw_answer:
        validated_citations: list[CitationItem] = []
    else:
        validated_citations = CitationService.validate_citations(
            answer=raw_answer,
            source_map=evidence.source_map,
        )

    logger.info(
        "RAG query completed: user=%s chunks=%d citations=%d strategy=%s",
        user_id,
        len(results),
        len(validated_citations),
        retrieval_strategy,
    )

    # 10. Persist and return response
    return await _persist_and_respond(
        ans=raw_answer,
        citations_list=validated_citations,
        retrieval_meta=retrieval_meta,
    )
