# ADR-0002: Vector Database — Chroma for MVP

**Date:** 2024  
**Status:** Accepted

---

## Context

DocuMind requires a vector store to index and retrieve document chunk embeddings. The MVP needs something simple to set up for local development, with a path to a more scalable option later.

---

## Decision

Use **ChromaDB** (embedded mode with filesystem persistence) as the initial vector store.

---

## Alternatives Considered

| Alternative | Trade-offs |
|---|---|
| Pinecone | Managed SaaS, excellent scalability, but requires internet and adds cost |
| Weaviate | More complex to self-host; powerful but over-engineered for MVP |
| Qdrant | Excellent performance, Rust-based, but heavier than Chroma for getting started |
| pgvector | Keeps everything in Postgres; limited ANN performance at scale |
| FAISS | No persistence layer; requires manual metadata management |

---

## Trade-offs

**Chosen (Chroma):**
- Zero infrastructure — runs in-process
- Native Python client
- Supports metadata filtering (owner_id, document_id)
- Persistent filesystem storage
- Easy to swap for a production vector store later via the repository interface

**Downsides:**
- Not designed for high-concurrency multi-user production workloads
- Embedded mode is single-process
- Less mature than Pinecone or Qdrant at scale

---

## Consequences

- All vector store access goes through `providers/vector_store/base.py`.
- Switching to Qdrant or Weaviate requires only a new adapter implementation.
- Chroma is not recommended beyond small-to-medium scale production without careful evaluation.
- The `CHROMA_PERSIST_DIR` must be writable and backed up in production.
