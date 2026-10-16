# Phase 04 — Citations & History

**Status:** ✅ Complete

## Goal
Implement persistent conversation threads, multi-turn RAG chat history, conversation management APIs, and an interactive conversation history sidebar in the frontend.

## Acceptance Criteria
- [x] `GET /api/v1/conversations` returns paginated list of user's conversations with message counts
- [x] `GET /api/v1/conversations/{id}` returns conversation metadata and full message history
- [x] `DELETE /api/v1/conversations/{id}` cascades deletion to conversation messages
- [x] `PATCH /api/v1/conversations/{id}` renames conversation title
- [x] `POST /api/v1/chat/query` accepts `conversation_id` and records user question and assistant answer
- [x] `POST /api/v1/chat/query` automatically creates a new conversation thread when `conversation_id` is omitted
- [x] Multi-tenant isolation: users cannot view, modify, or append messages to other users' conversations
- [x] Follow-up questions in a conversation thread leverage recent conversation context
- [x] Historical assistant messages preserve interactive citations linking to source snippets
- [x] Frontend conversation sidebar shows list of threads, active thread indicator, and "+ New Chat" action
- [x] Frontend allows deleting conversation threads with UI update
- [x] Backend unit and integration tests verify conversation lifecycle, multi-tenancy, and message persistence

## Architecture & Implementation Summary

### Backend
1. **Schemas & Data Contract (`backend/app/schemas/`):**
   - `conversations.py`: `ConversationSummary`, `ConversationDetailResponse`, `ConversationUpdateTitle`, `MessageResponse`.
   - `chat.py`: Updated `ChatQueryResponse` with `conversation_id: str | None`.
2. **Conversations CRUD API (`backend/app/api/v1/conversations.py`):**
   - `GET /api/v1/conversations`: Paginated list of conversations with message count via SQL subquery, ordered by `updated_at DESC`.
   - `GET /api/v1/conversations/{id}`: Detailed conversation with full chronological message history (`role`, `content`, `citations`, `retrieval_metadata`).
   - `PATCH /api/v1/conversations/{id}`: Updates conversation title.
   - `DELETE /api/v1/conversations/{id}`: Cascade deletion of conversation and child messages with 204 response.
3. **Multi-Turn Context & Pipeline Persistence (`backend/app/rag/`):**
   - `pipeline.py`: Automatically creates or loads `Conversation` thread scoped to user; retrieves prior 6 messages to provide conversational memory; records user message and assistant completion with validated citations; persists turn atomically and commits.
   - `prompt_builder.py`: Formats prior conversation history context into the user prompt.
4. **Router Registration (`backend/app/api/v1/router.py`):**
   - Registered `conversations.router` under `/conversations`.

### Frontend
1. **API Hooks (`frontend/src/features/chat/conversationsApi.ts`):**
   - `useConversations`: Queries paginated user conversation threads.
   - `useConversation`: Queries detailed messages for the selected thread.
   - `useDeleteConversation`: Deletes conversation and invalidates cache.
   - `useUpdateConversationTitle`: Patches thread title and updates query cache.
2. **Components (`frontend/src/features/chat/`):**
   - `ConversationSidebar`: History list, active thread highlight, "+ New Chat" button, and delete action.
   - `ChatPage`: Integrated dual sidebar layout, active thread switching, historical message rendering, seamless citation inspection on past turns, and message posting within thread.

### Verification Results
- **Backend Tests:** 92/92 passed in 15.98s (`pytest`).
  - Integration tests in `test_conversations_api.py` verifying thread auto-creation, message persistence, multi-turn follow-ups, title updates, cascade deletion, and multi-tenant isolation.
  - Linters: `ruff check` and `ruff format --check` passed cleanly.
- **Frontend Tests:** 15/15 passed in 61.58s (`vitest`).
  - Unit & integration tests in `ChatPage.test.tsx` verifying sidebar rendering, conversation selection, historical message loading, and New Chat reset.
  - Linters: `eslint` passed with 0 errors and 0 warnings.
  - Production build: `tsc && vite build` succeeded in 19.51s with 0 errors.
