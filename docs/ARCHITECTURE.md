# Architecture

## System Overview

DocuMind uses a layered architecture that cleanly separates the frontend, API, business logic, AI/RAG pipeline, and persistence.

```
┌──────────────────────────────────────────────────────────────┐
│                        Browser Client                        │
│          React + TypeScript + Vite + Tailwind CSS            │
└─────────────────────────┬────────────────────────────────────┘
                          │ HTTPS / REST
┌─────────────────────────▼────────────────────────────────────┐
│                     FastAPI Application                      │
│  Auth · Routing · Validation · Rate limiting · Logging       │
└──────┬──────────────────┬──────────────────┬─────────────────┘
       │                  │                  │
┌──────▼──────┐  ┌────────▼──────┐  ┌───────▼─────────────────┐
│  Auth       │  │  Document     │  │  Chat / Conversation     │
│  Service    │  │  Service      │  │  Service                 │
└──────┬──────┘  └────────┬──────┘  └───────┬─────────────────┘
       │                  │                  │
       │         ┌────────▼──────────────────▼─────────────────┐
       │         │              RAG Pipeline                    │
       │         │  Query · Retrieval · Context · Generation    │
       │         └──┬──────────┬──────────┬────────────────────┘
       │            │          │          │
┌──────▼────────────▼──┐  ┌───▼──────┐  ┌▼───────────────────┐
│  PostgreSQL           │  │  Chroma  │  │  LLM Provider      │
│  (metadata)           │  │  (vector │  │  (OpenAI/Anthropic │
│                       │  │   store) │  │   /local/mock)     │
└───────────────────────┘  └──────────┘  └────────────────────┘
```

## Layers

### Layer 1: Frontend

- User interface and navigation
- Document upload and status polling
- Chat input and answer rendering with citations
- Conversation history management
- Form validation (client-side, Zod)
- Calls the backend REST API only — never touches the database

### Layer 2: FastAPI Application

- Request validation via Pydantic
- JWT authentication and authorization
- Versioned API routing (`/api/v1`)
- Rate limiting (configurable)
- Unique request IDs and structured logging
- Standardized error responses
- Route handlers are thin — they validate and delegate to services

### Layer 3: Business Services

- `AuthService` — registration, login, token issuance
- `DocumentService` — document lifecycle management
- `IngestionService` — orchestrates parsing → chunking → embedding → indexing
- `ChatService` — orchestrates the RAG query pipeline
- `ConversationService` — conversation and message persistence
- `SummaryService` — document and multi-document summarization

Services have no HTTP dependencies. They are independently testable.

### Layer 4: AI and RAG Pipeline

Components in `app/rag/`:
- `query_processing.py` — query normalization and embedding
- `retrieval.py` — vector store retrieval with owner filtering
- `hybrid_search.py` — optional lexical + semantic fusion
- `reranking.py` — optional cross-encoder reranking
- `prompt_builder.py` — grounded context construction
- `generation.py` — LLM call and response handling
- `citation_service.py` — citation mapping and validation
- `abstention.py` — insufficient-evidence detection
- `pipeline.py` — orchestrates the above stages

### Layer 5: Infrastructure Adapters

- `providers/llm/` — swappable LLM provider (OpenAI, Anthropic, mock)
- `providers/embeddings/` — swappable embedding provider
- `providers/vector_store/` — Chroma adapter behind a repository interface
- `providers/storage/` — local filesystem (S3-compatible in future)
- `db/` — SQLAlchemy async session, base model, init helpers

## Data Flow: Document Ingestion

```
Upload → Validate → Store file → Create DB record (uploaded)
  → Parse text (PDF/DOCX/TXT) → Normalize → Chunk
  → Embed chunks → Store in Chroma + PostgreSQL
  → Update DB record (ready | failed)
```

## Data Flow: Chat Query

```
Question + document IDs
  → Validate ownership + document readiness
  → Embed query
  → Retrieve top-k chunks (owner-filtered)
  → Apply score threshold / rerank
  → Check evidence sufficiency
  → Build grounded prompt
  → Call LLM provider
  → Validate citations
  → Persist message
  → Return answer + citations
```

## Key Design Decisions

See the Architecture Decision Records in `docs/ADR/` for rationale on major choices.
