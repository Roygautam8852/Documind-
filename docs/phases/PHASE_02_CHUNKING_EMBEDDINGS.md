# Phase 02 — Chunking and Embeddings

**Status:** ✅ Complete

## Goal
Split extracted document text into indexable chunks, generate embeddings via the configured provider, and store vectors in Chroma with complete metadata linkage.

## Acceptance Criteria
- [x] Configurable chunking (CHUNK_SIZE, CHUNK_OVERLAP) by token count
- [x] Chunks prefer semantic boundaries (paragraphs)
- [x] Page and owner metadata preserved on every chunk
- [x] No empty or duplicate chunks produced
- [x] Uniqueness constraint (document_id, chunk_index) enforced
- [x] Embedding provider interface implemented
- [x] SentenceTransformer adapter working
- [x] Mock embedding adapter for tests
- [x] Chroma vector store adapter working
- [x] Re-indexing is idempotent (safe to retry)
- [x] Unit tests: chunking edge cases, embedding adapter, retrieval
- [x] Integration test: document → chunk → embed → retrieve via interface
