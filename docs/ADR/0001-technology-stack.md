# ADR-0001: Technology Stack Selection

**Date:** 2024  
**Status:** Accepted

---

## Context

DocuMind requires a full-stack architecture for an AI-powered document processing application. The stack must support rapid development, type safety, async I/O for LLM calls, a strong Python AI ecosystem, and a maintainable codebase that a small team can evolve.

---

## Decision

- **Frontend:** React + TypeScript + Vite + Tailwind CSS  
- **Backend:** Python + FastAPI + Pydantic v2 + SQLAlchemy 2 (async)  
- **Testing:** Pytest (backend), Vitest + React Testing Library (frontend)  
- **Linting/Formatting:** Ruff  
- **Database:** PostgreSQL  
- **Deployment:** Docker + Docker Compose  

---

## Alternatives Considered

| Alternative | Reason Not Selected |
|---|---|
| Next.js (fullstack) | Adds complexity; clean API separation is preferred |
| Django + DRF | Synchronous by default; heavier than needed; less Pydantic-native |
| Express.js backend | Python AI ecosystem is superior for RAG workloads |
| MongoDB | Relational integrity for user/document/chunk relationships preferred |
| SQLModel | Less mature than SQLAlchemy 2 at time of decision |

---

## Trade-offs

- Python adds a language boundary between frontend and backend, but the AI ecosystem advantage is decisive.
- Vite + React is mature and widely understood; alternative frameworks (Solid, Svelte) offer less ecosystem support for this use case.
- Tailwind CSS increases initial learning curve but significantly reduces CSS maintenance burden over time.

---

## Consequences

- The team must be comfortable with TypeScript and Python.
- FastAPI's async model requires async-compatible database drivers (`asyncpg`).
- Pydantic v2 is not backward-compatible with v1; all model definitions use v2 syntax.
