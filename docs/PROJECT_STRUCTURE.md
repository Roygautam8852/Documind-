# Project Structure

## Root Layout

```
documind/
├── README.md                   # Project overview and quick start
├── LICENSE
├── .gitignore
├── .env.example                # Environment variable template
├── docker-compose.yml          # Multi-service local orchestration
├── Makefile                    # Developer task shortcuts
│
├── .github/workflows/ci.yml    # GitHub Actions CI pipeline
│
├── docs/                       # All project documentation
├── prompts/                    # LLM system prompt templates
├── evaluation/                 # RAG evaluation tooling and datasets
├── scripts/                    # Developer helper scripts
├── data/                       # Local runtime data (gitignored)
│
├── backend/                    # Python FastAPI application
└── frontend/                   # React + Vite application
```

---

## backend/

```
backend/
├── pyproject.toml              # Python project metadata and dependencies
├── alembic.ini                 # Alembic migration configuration
├── Dockerfile
├── .env.example
│
├── alembic/
│   ├── env.py                  # Migration environment configuration
│   └── versions/               # Auto-generated migration scripts
│
└── app/
    ├── main.py                 # FastAPI app factory and startup
    │
    ├── core/
    │   ├── config.py           # Pydantic Settings — all env vars
    │   ├── logging.py          # Structured logging setup
    │   ├── exceptions.py       # Application exception classes
    │   ├── security.py         # JWT, password hashing
    │   └── request_context.py  # Request ID middleware
    │
    ├── api/
    │   ├── dependencies.py     # Shared FastAPI dependencies (auth, db)
    │   └── v1/
    │       ├── router.py       # Versioned API router
    │       ├── health.py       # GET /health, GET /ready
    │       ├── auth.py         # POST /auth/register, /auth/login, etc.
    │       ├── documents.py    # Document CRUD endpoints
    │       ├── chat.py         # POST /chat/query, /chat/summarize
    │       ├── conversations.py # Conversation management
    │       └── summaries.py    # Summary endpoints
    │
    ├── schemas/                # Pydantic request/response schemas
    │   ├── common.py           # Shared schemas (pagination, error)
    │   ├── auth.py
    │   ├── document.py
    │   ├── chat.py
    │   ├── citation.py
    │   └── conversation.py
    │
    ├── models/                 # SQLAlchemy ORM models
    │   ├── user.py
    │   ├── document.py
    │   ├── chunk.py
    │   ├── conversation.py
    │   └── message.py
    │
    ├── repositories/           # Data access layer
    │   ├── user_repository.py
    │   ├── document_repository.py
    │   ├── chunk_repository.py
    │   ├── conversation_repository.py
    │   └── message_repository.py
    │
    ├── services/               # Business logic (no HTTP dependencies)
    │   ├── auth_service.py
    │   ├── document_service.py
    │   ├── ingestion_service.py
    │   ├── chat_service.py
    │   ├── conversation_service.py
    │   └── summary_service.py
    │
    ├── document_processing/    # Parsing and chunking
    │   ├── parser_factory.py   # Selects parser by MIME type
    │   ├── pdf_parser.py
    │   ├── docx_parser.py
    │   ├── txt_parser.py
    │   ├── normalization.py
    │   └── chunking.py
    │
    ├── rag/                    # RAG pipeline stages
    │   ├── pipeline.py         # Orchestrates all stages
    │   ├── query_processing.py
    │   ├── embeddings.py
    │   ├── retrieval.py
    │   ├── hybrid_search.py
    │   ├── reranking.py
    │   ├── prompt_builder.py
    │   ├── generation.py
    │   ├── citation_service.py
    │   ├── abstention.py
    │   └── evaluation.py
    │
    ├── providers/              # Infrastructure adapters
    │   ├── llm/
    │   │   ├── base.py         # Abstract LLM provider interface
    │   │   ├── mock_provider.py
    │   │   └── configured_provider.py
    │   ├── embeddings/
    │   │   ├── base.py
    │   │   ├── sentence_transformer.py
    │   │   └── mock_embeddings.py
    │   ├── vector_store/
    │   │   ├── base.py
    │   │   └── chroma_store.py
    │   └── storage/
    │       ├── base.py
    │       └── local_storage.py
    │
    ├── workers/
    │   └── ingestion_worker.py # Background ingestion task
    │
    └── db/
        ├── session.py          # Async SQLAlchemy session factory
        ├── base.py             # Declarative base
        └── init_db.py          # DB initialization helpers
```

---

## frontend/

```
frontend/
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.ts
├── Dockerfile
├── index.html
│
└── src/
    ├── main.tsx                # React entry point
    ├── App.tsx                 # Root component with providers
    │
    ├── app/
    │   ├── router.tsx          # React Router configuration
    │   ├── providers.tsx       # QueryClient, Auth, theme providers
    │   └── query-client.ts     # TanStack Query client config
    │
    ├── components/
    │   ├── layout/             # Page shells, sidebars, nav
    │   ├── ui/                 # Reusable primitives (Button, Card, etc.)
    │   ├── feedback/           # Loading, empty, error states
    │   └── citations/          # Citation display components
    │
    ├── features/               # Feature-scoped components and logic
    │   ├── auth/
    │   ├── dashboard/
    │   ├── documents/
    │   ├── chat/
    │   ├── conversations/
    │   ├── summaries/
    │   └── settings/
    │
    ├── hooks/                  # Shared custom React hooks
    │
    ├── lib/
    │   ├── api-client.ts       # Typed fetch wrapper
    │   ├── errors.ts           # Error handling utilities
    │   └── validation.ts       # Shared Zod schemas
    │
    ├── types/
    │   ├── api.ts              # API response types
    │   ├── document.ts
    │   ├── chat.ts
    │   └── citation.ts
    │
    └── styles/
        └── globals.css         # Tailwind base + custom properties
```

---

## data/

Local runtime directory. **Contents are gitignored.**

```
data/
├── uploads/    # Uploaded document files
├── chroma/     # Chroma vector store persistence
└── logs/       # Application log files
```

---

## evaluation/

```
evaluation/
├── README.md
├── datasets/
│   └── sample_questions.jsonl  # Labelled evaluation dataset
├── scripts/
│   └── run_evaluation.py       # Evaluation runner
└── reports/                    # Generated metric reports
```
