# Technology Stack

## Frontend

| Technology | Version | Rationale |
|---|---|---|
| React | 18 | Industry-standard UI library with rich ecosystem |
| TypeScript | 5 | Type safety, better IDE support, fewer runtime errors |
| Vite | 5 | Fast dev server and optimized builds |
| Tailwind CSS | 3 | Utility-first CSS, fast iteration, consistent design |
| React Router | 6 | Client-side routing with data loading patterns |
| TanStack Query | 5 | Server state management, caching, background sync |
| React Hook Form | 7 | Performant form handling with minimal re-renders |
| Zod | 3 | Runtime schema validation, pairs with React Hook Form |
| Lucide React | latest | Consistent, tree-shakeable icon set |

## Backend

| Technology | Version | Rationale |
|---|---|---|
| Python | 3.11 | Stable, well-supported, strong AI/ML ecosystem |
| FastAPI | 0.111 | Async, Pydantic-native, automatic OpenAPI docs |
| Pydantic | 2 | Strict validation, serialization, settings management |
| SQLAlchemy | 2 | Async ORM, flexible query building |
| Alembic | 1.13 | Database migration management |
| Pytest | 8 | Test framework, fixtures, async support |
| Ruff | 0.4 | Fast linter + formatter, replaces flake8/black/isort |
| Uvicorn | 0.29 | ASGI server for FastAPI |

## AI and RAG

| Technology | Version | Rationale |
|---|---|---|
| Sentence Transformers | 3 | Local embeddings, no API cost, configurable models |
| ChromaDB | 0.5 | Simple local vector store, suitable for MVP scale |
| PyMuPDF (fitz) | 1.24 | Reliable PDF text extraction with page metadata |
| python-docx | 1 | DOCX parsing with paragraph-level structure |

LLM providers are accessed through an abstract interface to avoid vendor lock-in. Supported adapters: OpenAI, Anthropic, Google, and mock.

## Database and Storage

| Technology | Rationale |
|---|---|
| PostgreSQL 16 | Mature, reliable, excellent for relational metadata |
| Chroma | Simple persistence, good Python integration for MVP |
| Local filesystem | Zero-dependency development storage |

## DevOps

| Technology | Rationale |
|---|---|
| Docker | Reproducible environments |
| Docker Compose | Multi-service local orchestration |
| GitHub Actions | CI/CD integration with the repository |
| Pytest | Backend testing |
| Vitest | Fast frontend unit tests |
| React Testing Library | Component testing aligned with user behavior |
| Playwright | Candidate for future browser-based end-to-end coverage; not currently installed |

## Version Constraints

- Python must be `>=3.11` due to `asyncio.TaskGroup` and improved typing.
- SQLAlchemy 2 uses `async_sessionmaker`; SQLAlchemy 1 is incompatible.
- Pydantic 2 has a breaking API from v1; v1 is not supported.
- Chroma 0.5+ changed the client API from 0.4; do not mix versions.
- Node.js must be `>=20` for native fetch and `--experimental-vm-modules` in Vitest.
