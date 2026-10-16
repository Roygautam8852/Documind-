# Phase 01 — Document Ingestion

**Status:** ✅ Complete  
**Goal:** Enable users to upload PDF, DOCX, and TXT files, validate them, extract text preserving source metadata, and track document processing states through the document library UI.

---

## Acceptance Criteria

- [x] POST /documents accepts PDF, DOCX, TXT files
- [x] Extension and MIME type validation enforced
- [x] Size limit enforced (MAX_UPLOAD_MB)
- [x] File stored with server-generated key outside web root
- [x] Document metadata created in PostgreSQL
- [x] Text extracted with page/paragraph metadata
- [x] Document status transitions: uploaded → processing → ready | failed
- [x] GET /documents returns user's documents (paginated)
- [x] GET /documents/{id} returns document details and status
- [x] DELETE /documents/{id} removes file, DB record, and chunks
- [x] POST /documents/{id}/retry re-processes a failed document
- [x] Frontend document library shows upload progress and status
- [x] Drag-and-drop upload UI functional
- [x] Unit tests for all parsers (PDF, DOCX, TXT)
- [x] Integration test: upload → parse → list → delete

---

## Exit Criteria Verification

| Check | Method | Result |
|---|---|---|
| Parser unit tests | `pytest tests/unit/test_parsers.py` | ✅ 12/12 passed |
| Document API tests | `pytest tests/integration/test_document_api.py` | ✅ 12/12 passed |
| Lifecycle integration | `test_upload_parse_list_delete_lifecycle` | ✅ Passed |
| Backend lint & format | `ruff check app tests` / `ruff format --check` | ✅ Passed |
| Frontend components & validation | `vitest run` | ✅ 10/10 passed |
| Frontend lint | `npm run lint` | ✅ 0 errors |
| Frontend build | `npm run build` | ✅ Clean bundle |
