# Phase 00 — Foundation

**Status:** ✅ Complete  
**Goal:** Establish the project scaffold, tooling, configuration, and initial documentation so that subsequent phases have a stable, testable foundation.

---

## Acceptance Criteria

- [x] Repository structure matches the specification
- [x] Backend starts successfully with `uvicorn app.main:app`
- [x] `GET /health` returns `200 OK` with version information
- [x] `GET /ready` returns `200 OK` when database is reachable, `503` when not
- [x] Backend configuration is loaded from environment variables with validation
- [x] Structured logging is configured
- [x] Error handling middleware is in place
- [x] Linting passes (`ruff check`, `ruff format --check`)
- [x] At least one passing backend test
- [x] Frontend dev server starts successfully
- [x] Frontend connects to backend health endpoint
- [x] Docker Compose starts all services without error
- [x] CI workflow is defined
- [x] All required documentation files are created

---

## Files Created

### Root
- `README.md`
- `.gitignore`
- `.env.example`
- `docker-compose.yml`
- `Makefile`
- `LICENSE`
- `.github/workflows/ci.yml`

### Documentation
- `docs/INDEX.md`
- `docs/ARCHITECTURE.md`
- `docs/TECH_STACK.md`
- `docs/PROJECT_STRUCTURE.md`
- `docs/DATA_MODEL.md`
- `docs/ENVIRONMENT_VARIABLES.md`
- `docs/SECURITY.md`
- `docs/DEVELOPMENT_GUIDE.md`
- `docs/RAG_DESIGN.md`
- `docs/CONTRIBUTING.md`
- `docs/KNOWN_LIMITATIONS.md`
- `docs/DATABASE_MIGRATIONS.md`
- `docs/ADR/0001-technology-stack.md`
- `docs/ADR/0002-vector-database.md`
- `docs/ADR/0003-embedding-strategy.md`
- `docs/ADR/0004-rag-retrieval-strategy.md`
- `docs/phases/PHASE_00_FOUNDATION.md` (this file)

### Backend
- `backend/pyproject.toml`
- `backend/alembic.ini`
- `backend/Dockerfile`
- `backend/.env.example`
- `backend/alembic/env.py`
- `backend/app/main.py`
- `backend/app/core/config.py`
- `backend/app/core/logging.py`
- `backend/app/core/exceptions.py`
- `backend/app/core/security.py`
- `backend/app/core/request_context.py`
- `backend/app/api/dependencies.py`
- `backend/app/api/v1/router.py`
- `backend/app/api/v1/health.py`
- `backend/app/schemas/common.py`
- `backend/app/models/user.py`
- `backend/app/models/document.py`
- `backend/app/models/chunk.py`
- `backend/app/models/conversation.py`
- `backend/app/models/message.py`
- `backend/app/db/session.py`
- `backend/app/db/base.py`
- `backend/tests/unit/test_health.py`

### Frontend
- `frontend/package.json`
- `frontend/tsconfig.json`
- `frontend/vite.config.ts`
- `frontend/tailwind.config.ts`
- `frontend/index.html`
- `frontend/Dockerfile`
- `frontend/src/main.tsx`
- `frontend/src/App.tsx`
- `frontend/src/app/router.tsx`
- `frontend/src/app/providers.tsx`
- `frontend/src/app/query-client.ts`
- `frontend/src/lib/api-client.ts`
- `frontend/src/styles/globals.css`

---

## Exit Criteria Verification

| Check | Method | Result |
|---|---|---|
| Backend starts | `uvicorn app.main:app` | ✅ |
| Health endpoint | `GET /health` | ✅ 200 OK |
| Readiness endpoint | `GET /ready` | ✅ 200/503 |
| Linting | `ruff check app/` | ✅ Pass |
| Unit tests | `pytest tests/unit/` | ✅ Pass |
| Frontend starts | `npm run dev` | ✅ |
| Docker Compose | `docker compose up` | ✅ |
