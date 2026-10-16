# API Specification

Base URL: `/api/v1`  
All responses are JSON. All protected endpoints require `Authorization: Bearer <token>`.

---

## Error Response Schema

```json
{
  "error_code": "string",
  "message": "string",
  "request_id": "string",
  "detail": null
}
```

| HTTP Status | Meaning |
|---|---|
| 400 | Bad request |
| 401 | Authentication required or token invalid |
| 403 | Permission denied |
| 404 | Resource not found |
| 409 | Conflict (e.g., duplicate email) |
| 413 | File too large |
| 415 | Unsupported media type |
| 422 | Validation error |
| 429 | Rate limit exceeded |
| 502 | LLM provider unavailable |
| 503 | Service not ready |

---

## Health

### `GET /api/v1/health`
Liveness check. Always 200 when the process is running.

**Response 200:**
```json
{ "status": "ok", "version": "0.1.0", "app_name": "DocuMind" }
```

### `GET /api/v1/ready`
Readiness check. 200 when database is reachable, 503 otherwise.

**Response 200:**
```json
{ "status": "ready", "database": "ok", "version": "0.1.0" }
```

---

## Auth

### `POST /api/v1/auth/register`
**Body:** `{ "email": "string", "password": "string (min 8)" }`  
**Response 201:** `{ "access_token": "string", "token_type": "bearer", "expires_in": 3600 }`

### `POST /api/v1/auth/login`
**Body:** `{ "email": "string", "password": "string" }`  
**Response 200:** `{ "access_token": "string", "token_type": "bearer", "expires_in": 3600 }`

### `GET /api/v1/auth/me`
**Auth required.**  
**Response 200:** `{ "id": "uuid", "email": "string" }`

---

## Documents *(Phase 01)*

### `POST /api/v1/documents`
Upload a document. `multipart/form-data` with field `file`.  
**Auth required.** Max size: `MAX_UPLOAD_MB`.

### `GET /api/v1/documents`
List user's documents (paginated).  
**Query params:** `page`, `page_size`

### `GET /api/v1/documents/{document_id}`
Get document metadata and status.

### `DELETE /api/v1/documents/{document_id}`
Delete document, chunks, and vectors.

### `POST /api/v1/documents/{document_id}/retry`
Re-process a failed document.

---

## Chat *(Phase 03)*

### `POST /api/v1/chat/query`
**Body:**
```json
{
  "question": "string",
  "document_ids": ["uuid"],
  "conversation_id": "uuid | null"
}
```

**Response 200:**
```json
{
  "answer": "string",
  "citations": [
    {
      "citation_id": "cite_1",
      "document_id": "uuid",
      "filename": "report.pdf",
      "page_number": 4,
      "chunk_id": "uuid",
      "snippet": "string"
    }
  ],
  "retrieval": { "result_count": 3 },
  "request_id": "string"
}
```

### `POST /api/v1/chat/summarize/{document_id}`
Generate a summary of the specified document. *(Phase 06)*

---

## Conversations *(Phase 04)*

### `GET /api/v1/conversations`
List user's conversations (paginated).

### `GET /api/v1/conversations/{conversation_id}`
Get conversation with messages.

### `DELETE /api/v1/conversations/{conversation_id}`
Delete conversation and all messages.

---

## Request ID

Every response includes an `X-Request-ID` header with a unique UUID.  
If the client sends `X-Request-ID`, the server echoes it back.
