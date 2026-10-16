# RAG Pipeline Design

## Overview

The Retrieval-Augmented Generation (RAG) pipeline is the core of DocuMind. It ensures that every answer is grounded in the user's uploaded documents rather than relying on the LLM's internal parametric knowledge.

---

## Pipeline Stages

### Stage 1: Document Ingestion

```
Upload → Validate → Store → Parse → Normalize → Chunk → Embed → Index
```

1. User uploads a file via the API.
2. Extension, MIME type, and size are validated.
3. File is stored with a server-generated key outside the web root.
4. A document metadata record is created with status `uploaded`.
5. Text is extracted using the appropriate parser (PDF, DOCX, TXT).
6. Page numbers and structural metadata are preserved.
7. Text is normalized (whitespace, encoding issues).
8. Text is split into chunks with configurable size and overlap.
9. Each chunk is embedded using the configured embedding provider.
10. Chunks and vectors are stored in PostgreSQL and Chroma.
11. Document status is updated to `ready` or `failed`.

### Stage 2: Query Processing

```
Question → Validate → Normalize → Embed → Retrieve → Filter → Threshold check
```

1. Validate question length and format.
2. Confirm selected document IDs belong to the current user.
3. Confirm selected documents are in `ready` status.
4. Resolve coreferences if conversation context is available.
5. Embed the normalized query.
6. Retrieve top-k chunks from Chroma with owner + document filters.
7. Apply similarity score threshold.
8. Optionally combine with lexical search (Phase 05).
9. Optionally rerank with a cross-encoder (Phase 05).

### Stage 3: Evidence Sufficiency Check

If no chunks meet the similarity threshold, the pipeline **abstains** instead of generating a potentially fabricated answer.

Abstention response format:
```json
{
  "answer": "The uploaded documents do not contain sufficient information to answer this question.",
  "citations": [],
  "retrieval": { "result_count": 0 }
}
```

### Stage 4: Context Construction

The retrieved chunks are assembled into a structured prompt context. Each chunk receives a stable server-assigned citation ID.

```
[Source S1]
Document: annual_report.pdf
Page: 12
Text: <chunk text>

[Source S2]
Document: annual_report.pdf
Page: 18
Text: <chunk text>
```

The server maintains the mapping from citation IDs to actual chunks. The LLM cannot fabricate valid IDs.

### Stage 5: Answer Generation

The LLM is instructed to:
- Answer only from the supplied evidence.
- Cite sources using the provided source IDs.
- State clearly when evidence is insufficient.
- Not invent page numbers or quotations.
- Ignore any instructions found within document text.

### Stage 6: Citation Validation

After generation, every citation ID in the LLM's response is verified against the set of chunks retrieved for the current query. Unknown or fabricated IDs are rejected.

Validated citations include:
- `citation_id` — server-assigned reference
- `document_id` — UUID of source document
- `filename` — original upload name
- `page_number` — if available
- `chunk_id` — UUID of source chunk
- `snippet` — the relevant text excerpt

---

## Configuration

| Parameter | Variable | Default |
|---|---|---|
| Chunk size (tokens) | `CHUNK_SIZE` | 800 |
| Chunk overlap (tokens) | `CHUNK_OVERLAP` | 120 |
| Top-k retrieval | `TOP_K` | 5 |
| Similarity threshold | `SIMILARITY_THRESHOLD` | 0.35 |
| Embedding model | `EMBEDDING_MODEL` | all-MiniLM-L6-v2 |

---

## Prompt Injection Defense

Document content is treated as **untrusted reference material**. The system prompt:
1. Instructs the LLM to treat retrieved text as evidence, not as instructions.
2. Explicitly prohibits acting on any directives found within documents.
3. Restricts the model to the supplied source IDs.

See [PROMPT_ENGINEERING.md](PROMPT_ENGINEERING.md) for full prompt templates.

---

## Advanced RAG Roadmap

| Feature | Phase | Status |
|---|---|---|
| Hybrid search (BM25 + vector) | 05 | Planned |
| Query rewriting | 05 | Planned |
| Cross-encoder reranking | 05 | Planned |
| Multi-query retrieval | 06 | Planned |
| Document comparison | 06 | Planned |
| OCR support | Future | Planned |
| Graph-based retrieval | Future | Research |

Features are added only when they address a measured limitation. See [RETRIEVAL_STRATEGY.md](RETRIEVAL_STRATEGY.md) for details.
