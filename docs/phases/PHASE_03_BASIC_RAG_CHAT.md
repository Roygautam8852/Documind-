# Phase 03 — Basic RAG Chat

**Status:** ✅ Complete

## Goal
Implement the end-to-end RAG pipeline: query embedding, vector retrieval, context construction, LLM generation, citation validation, and abstention. Build the chat UI.

## Acceptance Criteria
- [x] POST /chat/query retrieves relevant chunks and generates grounded answer
- [x] Citations map to actual retrieved chunks (server-validated)
- [x] Abstention when no evidence meets the threshold
- [x] Mock LLM provider for testing
- [x] Real LLM provider configured (OpenAI or compatible)
- [x] Prompt injection defense: document instructions cannot override system prompt
- [x] No fabricated citations returned to user
- [x] Chat UI renders answer and source citations
- [x] Source snippet viewer shows chunk text and page reference
- [x] Loading and error states in chat UI
- [x] Unit tests: prompt builder, citation validation, abstention logic
- [x] Integration test: question → retrieval → generation → citations

## Architecture & Implementation Summary

### Backend
1. **LLM Provider Abstraction (`backend/app/providers/llm/`):**
   - `BaseLLMProvider`: ABC with `generate_completion(messages, temperature, max_tokens)`.
   - `MockLLMProvider`: Deterministic grounded completion engine that matches evidence tokens and abstains when insufficient.
   - `OpenAILLMProvider`: Production provider using asynchronous `httpx` client targeting OpenAI/compatible completions API.
   - `factory.py`: `get_llm_provider()` factory caching providers per settings.
2. **RAG Pipeline (`backend/app/rag/`):**
   - `prompt_builder.py`: RAG prompt builder loading system instructions with anti-injection fences (`[UNTRUSTED DOCUMENT DATA]`), delimiter neutralizers, and `[Source S{i}]` markers.
   - `citation_service.py`: Server-side citation extraction, validation, and metadata mapping. Discards any hallucinated `[S{i}]` markers absent from retrieved evidence.
   - `abstention.py`: Abstention checks for empty retrievals and below-threshold similarity (`SIMILARITY_THRESHOLD = 0.35`).
   - `pipeline.py`: Complete orchestration executing query validation, embedding generation, multi-tenant vector similarity search, threshold checks, LLM generation, and citation validation.
3. **API Router & Schemas (`backend/app/api/v1/chat.py`):**
   - `POST /api/v1/chat/query`: Secured endpoint with JWT authentication and tenant-level document authorization.

### Frontend
1. **Chat UI Features (`frontend/src/features/chat/`):**
   - `ChatPage`: Full conversational view with auto-scroll, empty-state prompts, error toasts, and retry actions.
   - `DocumentSelector`: Scoping selector allowing queries across all ready documents or filtered to a single document.
   - `ChatMessageItem`: Message bubbles rendering markdown, assistant badges, and interactive citation chips.
   - `CitationBadge`: Interactive source citation pill `[S1] filename p.X` displaying page and document info.
   - `SourceSnippetModal`: Dialog displaying exact retrieved chunk text, score, page number, and source filename.
   - `ChatInput`: Textarea with auto-resize, Enter-to-submit, Shift+Enter newline, and loading states.

### Verification Results
- **Backend:** 88/88 tests passing (`pytest`) in 13.96s.
  - Unit tests: `test_prompt_builder.py`, `test_citation_validation.py`, `test_abstention.py`, `test_llm_providers.py`.
  - Integration tests: `test_chat_api.py` (grounded Q&A, abstention, doc scoping, multi-tenant isolation, ready-status enforcement, auth validation).
  - Linters: `ruff check` and `ruff format --check` 100% clean.
- **Frontend:** 14/14 tests passing (`vitest`) in 4.17s.
  - Unit tests: `ChatPage.test.tsx` (rendering, question submission, citation badge click, error state).
  - Linters: `eslint` passing with 0 warnings/errors.
  - Production build: `tsc && vite build` passing with 0 errors.
