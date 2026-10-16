# Phase 05 — Advanced Retrieval

**Status:** ✅ Complete

## Goal
Upgrade the retrieval pipeline with Hybrid Search (BM25 lexical matching + dense vector search via Reciprocal Rank Fusion), Conversational Query Reformulation, and pluggable Cross-Encoder Reranking.

## Acceptance Criteria
- [x] BM25 lexical retriever extracts terms and computes accurate BM25 scores over chunks
- [x] Reciprocal Rank Fusion (RRF) merges dense and sparse results with configurable `k` (default 60)
- [x] Hybrid search improves recall on exact terminology, IDs, error codes, and keyword-heavy queries
- [x] Query reformulator resolves coreferences and ambiguous pronouns in multi-turn conversation threads
- [x] Pluggable reranker interface with deterministic mock implementation for offline testing
- [x] Retrieval metadata tracks strategy ("hybrid" vs "vector"), component counts, and reranking state
- [x] Configuration toggles for `HYBRID_SEARCH_ENABLED`, `HYBRID_RRF_K`, `QUERY_REFORMULATION_ENABLED`, and `RERANKER_PROVIDER`
- [x] Frontend displays retrieval strategy pills and match scores
- [x] Unit tests for BM25 scoring, RRF fusion, query reformulation, and reranker
- [x] Integration tests verifying hybrid retrieval, keyword recall, and follow-up query resolution

## Summary of Implementation
- **BM25 Lexical Search (`backend/app/rag/bm25.py`)**: Built an Okapi BM25 engine with case-folding, alphanumeric tokenization, and stopword removal, querying tenant-isolated document chunks.
- **Reciprocal Rank Fusion (`backend/app/rag/fusion.py`)**: Implemented RRF algorithm ($RRF\_score = \sum \frac{1}{k + rank}$) seamlessly combining dense vector results and sparse lexical results.
- **Conversational Query Reformulation (`backend/app/rag/query_reformulator.py`)**: Resolves pronouns ("it", "they", "that") and follow-up questions using recent dialogue turns without adding latency when queries are already self-contained.
- **Pluggable Cross-Encoder Reranker (`backend/app/providers/reranker/`)**: Created extensible reranker abstraction with `MockReranker` for offline/deterministic testing and `CrossEncoderReranker` using `sentence-transformers.CrossEncoder`.
- **Pipeline Integration (`backend/app/rag/pipeline.py`)**: Integrated reformulation -> dense + lexical retrieval -> RRF fusion -> reranking -> abstention check -> generation. Extended response with `retrieval_strategy`, `dense_count`, `lexical_count`, and `reranked` status.
- **Frontend Badges & Scores**: Added visual pills for retrieval strategy (`Hybrid Search` / `Vector Search` • `Reranked`) and relevance match scores on citation pills.
- **Verification**: 103/103 backend pytest suites passed (0 failures); 15/15 Vitest suites passed; 0 lint errors across backend and frontend; production build succeeded.
