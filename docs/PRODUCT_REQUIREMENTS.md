# Product Requirements

## Product Vision

DocuMind is an AI-powered document intelligence platform that allows users to upload their documents and interact with them through natural-language conversations, receiving accurate, source-cited answers grounded in the uploaded content.

---

## Target Users

- University students and educators
- Researchers reading papers and reports
- Software engineers searching technical documentation
- Professionals reviewing business reports and policies
- Users managing collections of personal documents

---

## Core Principles

1. **Evidence over unsupported generation** — answers must cite retrievable sources
2. **Transparent citations** — users can inspect the exact text behind any answer
3. **Privacy** — documents are user-isolated; never used for model training
4. **Measurable retrieval quality** — RAG improvements tracked by metrics
5. **Accessible UX** — keyboard-navigable, clear states, responsive

---

## Functional Requirements

### Document Management
- Upload PDF, DOCX, and TXT files (configurable size limit, default 50 MB)
- Extract text preserving page metadata
- Track processing status: `uploaded → processing → ready | failed`
- List, view metadata, and delete documents
- Retry failed ingestion

### Question Answering
- Ask natural-language questions scoped to one or more documents
- Retrieve semantically relevant passages via vector search
- Generate answers grounded only in retrieved evidence
- Return verifiable citations with document name, page, and snippet
- Abstain when evidence is insufficient (no confident unsupported answers)
- Support follow-up questions within a conversation

### Conversation History
- Persist conversations and messages per user
- List and delete conversations
- Messages survive page reloads

### Summaries *(Phase 06)*
- Generate document summaries with citations
- Multi-document comparison

---

## Non-Functional Requirements

| Requirement | Target |
|---|---|
| Answer latency (p95) | < 10 seconds for typical queries |
| Upload processing | Async, non-blocking |
| User isolation | Documents and conversations are inaccessible to other users |
| No hallucinated citations | 100% of citations must map to retrieved chunks |
| Abstention rate | > 90% on questions with no relevant evidence |

---

## Acceptance Criteria (Phase 00 — Foundation)

- [ ] Backend starts and returns `200` on `GET /health`
- [ ] `GET /ready` returns `503` when database is unavailable
- [ ] Registration, login, and `GET /auth/me` work end-to-end
- [ ] Frontend loads without JavaScript errors
- [ ] Unit tests pass
- [ ] Linting passes
