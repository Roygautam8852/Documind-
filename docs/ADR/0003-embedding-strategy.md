# ADR-0003: Embedding Strategy

**Date:** 2024  
**Status:** Accepted

---

## Context

Embedding quality directly determines retrieval quality. The embedding model must balance cost, latency, quality, and privacy. The same model must be used for both indexing and query embedding.

---

## Decision

Use **Sentence Transformers** with `all-MiniLM-L6-v2` as the default embedding model, running locally.

---

## Alternatives Considered

| Alternative | Trade-offs |
|---|---|
| OpenAI `text-embedding-3-small` | High quality, but requires API calls, adds cost, sends data externally |
| OpenAI `text-embedding-ada-002` | Legacy; superseded by v3 |
| Cohere Embed | Strong multilingual support, but external dependency |
| Local `bge-large-en` | Higher quality but much heavier (1.3 GB) |
| `all-MiniLM-L6-v2` (chosen) | 90 MB, 384 dimensions, fast, solid quality for English |

---

## Trade-offs

**Chosen (`all-MiniLM-L6-v2` via Sentence Transformers):**
- No API cost
- Data stays local — better privacy posture
- 384-dimensional vectors (efficient Chroma storage)
- Good English-language semantic similarity
- Well-tested and widely used in RAG systems

**Downsides:**
- Less powerful than OpenAI or Cohere embeddings on complex queries
- Requires downloading the model (~90 MB) on first run
- English-centric; multilingual queries will degrade

---

## Consequences

- `EMBEDDING_MODEL` defaults to `all-MiniLM-L6-v2` but is configurable.
- Changing the embedding model requires re-indexing all existing chunks.
- The chunk metadata records the model name used at indexing time.
- Mixing chunks indexed with different models in the same collection is not permitted.
- A re-indexing migration script will be provided when the model changes.
