# ADR-0004: RAG Retrieval Strategy

**Date:** 2024  
**Status:** Accepted

---

## Context

There are many retrieval strategies in the RAG literature: pure vector search, keyword search, hybrid search, reranking, HyDE, multi-query, and others. Choosing the wrong strategy adds complexity without verified benefit.

---

## Decision

Start with **pure semantic vector retrieval** as the baseline. Add advanced techniques only after measuring a performance gap that justifies them.

Baseline configuration:
- Top-k = 5 chunks per query
- Cosine similarity filtering (threshold = 0.35)
- Owner and document ID filters applied at the Chroma query level
- Single query embedding per user question

---

## Alternatives Considered

| Technique | Decision |
|---|---|
| Hybrid search (BM25 + vector) | Deferred to Phase 05 pending baseline measurement |
| Query rewriting | Deferred to Phase 05 for follow-up handling |
| Cross-encoder reranking | Deferred to Phase 05 if precision gap is observed |
| HyDE (Hypothetical Document Embedding) | Research phase; not proven on all document types |
| Multi-query retrieval | Planned for Phase 06 multi-document scenarios |
| Parent-child chunking | Added only if chunk boundary issues are measured |

---

## Trade-offs

**Chosen (simple vector retrieval):**
- Easy to reason about, test, and debug
- Establishes a clear performance baseline
- Sufficient for most English-language factual queries against well-structured documents

**Downsides:**
- Keyword-heavy queries (exact model names, codes, IDs) may underperform vs. hybrid search
- Follow-up queries with coreferences ("What does it say about that?") may retrieve wrong chunks

---

## Consequences

- Phase 05 must measure and document retrieval metrics before adding complexity.
- All retrieval changes must be compared against the Phase 03 baseline.
- Retrieval parameters (`TOP_K`, `SIMILARITY_THRESHOLD`) are environment-configurable.
- The retrieval interface abstracts the strategy so hybrid search can be added without rewriting the pipeline.
