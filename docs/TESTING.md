# Testing Strategy

## Overview

Tests are organized into three layers: unit, integration, and frontend. Each layer serves a distinct purpose.

---

## Backend Unit Tests (`backend/tests/unit/`)

Test individual functions and modules in isolation, without database or external services.

| File | What it tests |
|---|---|
| `test_health.py` | Health/readiness endpoints, request IDs |
| `test_chunking.py` | Chunk boundaries, overlap, empty input *(Phase 02)* |
| `test_parsers.py` | PDF, DOCX, TXT extraction *(Phase 01)* |
| `test_retrieval.py` | Retrieval filters and score thresholds *(Phase 02)* |
| `test_citations.py` | Citation ID mapping and validation *(Phase 03)* |
| `test_abstention.py` | Abstention logic when evidence is insufficient *(Phase 03)* |

## Backend Integration Tests (`backend/tests/integration/`)

Test full API request/response cycles against an in-memory SQLite database.

| File | What it tests |
|---|---|
| `test_auth_api.py` | Registration, login, token validation, security |
| `test_document_api.py` | Upload, parse, list, delete *(Phase 01)* |
| `test_chat_api.py` | RAG query end-to-end *(Phase 03)* |
| `test_authorization.py` | Cross-user access prevention *(Phase 08)* |

## Frontend Tests (`frontend/src/**/*.test.tsx`)

Component tests using Vitest + React Testing Library.

| What is tested |
|---|
| Landing page renders correctly |
| Login form validation |
| Registration password requirements |
| Upload progress and status display *(Phase 01)* |
| Chat submission and citation display *(Phase 03)* |
| Loading and error states |
| API error handling |

---

## Running Tests

The current CI runs backend lint/tests and frontend lint/component tests/build. Browser-level Playwright E2E coverage is not included yet; use the manual full-flow checklist in [RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md) before a release.

### Backend
```bash
cd backend
# All tests
pytest tests/ -v

# Unit only
pytest tests/unit/ -v

# Integration only
pytest tests/integration/ -v

# With coverage
pytest tests/ --cov=app --cov-report=html
```

### Frontend
```bash
cd frontend
npm run test           # Watch mode
npm run test -- --run  # Single run
npm run test:coverage  # With coverage
```

---

## Test Environment

- Backend tests use **SQLite in-memory** via `aiosqlite` (no PostgreSQL needed)
- LLM provider is mocked (`LLM_PROVIDER=mock`)
- Embeddings are mocked (`EMBEDDING_PROVIDER=mock`)
- JWT secret is a fixed test value
- `conftest.py` sets environment variables before importing application code

## Security Testing Requirements

- Every document endpoint must verify `owner_id` in tests
- A user must never be able to read or modify another user's document
- Guessing a valid UUID must not be sufficient for access
- Cross-user conversation access must be tested explicitly *(Phase 08)*
