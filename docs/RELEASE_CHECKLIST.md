# Release Checklist

## Before release

- [ ] Review the change set and confirm no `.env` files, credentials, user documents, generated reports, or local database files are included.
- [ ] Run backend lint and formatting checks: `cd backend && ruff check app/ tests/ && ruff format --check app/ tests/`.
- [ ] Run backend tests: `cd backend && pytest tests/ -v`.
- [ ] Run frontend lint, tests, and production build: `cd frontend && npm ci && npm run lint && npm run test -- --run && npm run build`.
- [ ] Build the backend and frontend container images.
- [ ] Apply Alembic migrations to a disposable database and review both upgrade and downgrade paths.
- [ ] Exercise the full user flow: register, sign in, upload a valid document, wait for ingestion, ask a question, inspect a citation, summarize/compare, and delete the document.
- [ ] Verify unauthorized routes, cross-user resource isolation, file signature rejection, quota enforcement, and rate limits.
- [ ] Run representative RAG evaluations against a labeled corpus; review faithfulness and prompt-injection cases manually.
- [ ] Confirm production configuration uses a strong JWT secret, real LLM provider credentials, correct frontend origin, bounded quotas, and production database credentials.
- [ ] Confirm backups and restore procedures for PostgreSQL and document/vector data, plus TLS, monitoring, log retention, and incident contacts.

## Release and rollback

- [ ] Deploy to a staging environment and verify liveness/readiness, registration, upload, chat, and citation flows.
- [ ] Take a database and data-volume backup before production migration/deployment.
- [ ] Apply reviewed migrations, deploy the versioned images, and monitor error rates, latency, readiness, and provider failures.
- [ ] Roll back application images if needed. Restore a database backup only when a migration cannot be safely reversed; coordinate document/vector data restoration with the database snapshot.
- [ ] Record the released version, migration revision, deployment time, and any known limitations.
