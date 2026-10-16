# Contributing

## Code Quality Standards

- Write code that is readable, testable, and maintainable.
- Prefer explicit over implicit.
- Keep functions and modules focused and small.
- Do not introduce global mutable state.
- Write tests for new features and bug fixes.
- Update documentation when behavior changes.

---

## Backend Standards

- Python 3.11+.
- All code passes `ruff check` and `ruff format --check`.
- Type hints on all function signatures.
- Pydantic models for all API input/output.
- Services must not depend on FastAPI `Request` objects.
- Repositories own all database queries; services must not write raw SQL.
- Never log passwords, API keys, or raw document content.
- Errors must map to safe user-facing messages.

---

## Frontend Standards

- TypeScript strict mode enabled.
- No `any` types without explicit justification.
- All API calls go through `lib/api-client.ts`.
- Loading, error, and empty states required for every data-fetching component.
- No hard-coded data that should come from the API.
- Accessibility: all interactive elements have labels and keyboard support.

---

## Git Workflow

1. Branch from `main` or `develop`.
2. Use descriptive branch names: `feat/document-upload`, `fix/citation-validation`.
3. Write clear, present-tense commit messages: `Add PDF parser with page metadata`.
4. Keep commits focused — one logical change per commit.
5. Open a pull request against `develop`; get at least one review before merging to `main`.
6. All CI checks must pass before merge.

---

## Adding a New Feature

1. Read the relevant phase document in `docs/phases/`.
2. Update `docs/` if the feature changes architecture or APIs.
3. Implement in the correct module layer.
4. Add unit tests in `backend/tests/unit/` or `frontend/src/**/*.test.ts`.
5. Add integration tests in `backend/tests/integration/` where applicable.
6. Run `ruff` and `pytest` before pushing.
7. Update `KNOWN_LIMITATIONS.md` if the feature has documented constraints.

---

## Security

- Do not commit secrets, credentials, or `.env` files.
- Always validate ownership before returning or modifying user data.
- Treat document content as untrusted input in the RAG pipeline.
- Review `docs/SECURITY.md` before implementing features that touch auth, file handling, or AI generation.

---

## Architecture Decision Records

When making a significant technical decision, create an ADR in `docs/ADR/`. Use the existing records as a template.
