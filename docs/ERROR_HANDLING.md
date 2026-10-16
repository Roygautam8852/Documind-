# Error Handling

## Principles

1. Internal details (stack traces, file paths, SQL errors) are **never** returned to the client.
2. Every error response includes a machine-readable `error_code` and a human-readable `message`.
3. Every error response includes the `request_id` for server-side tracing.
4. HTTP status codes are used correctly and consistently.

---

## Application Exception Hierarchy

```
DocuMindError (500)
├── AuthenticationError (401)
│   ├── InvalidCredentialsError
│   ├── TokenExpiredError
│   └── TokenInvalidError
├── PermissionDeniedError (403)
├── NotFoundError (404)
│   ├── DocumentNotFoundError
│   └── ConversationNotFoundError
├── ValidationError (422)
│   ├── FileTooLargeError (413)
│   ├── UnsupportedFileTypeError (415)
│   └── MalformedFileError (422)
├── DocumentNotReadyError (409)
├── LLMProviderError (502)
├── EmbeddingError (500)
├── RateLimitError (429)
└── ConflictError (409)
```

Each exception class sets a default `status_code`, `error_code`, and `message`. These can be overridden at raise time.

---

## Standard Error Response

```json
{
  "error_code": "document_not_found",
  "message": "The requested document was not found.",
  "request_id": "a1b2c3d4-...",
  "detail": null
}
```

`detail` is used only for validation errors to list field-specific issues. It never contains internal information.

---

## Handler Mapping

| Exception type | Handler |
|---|---|
| `DocuMindError` | Returns `status_code`, `error_code`, `message`, `detail` |
| `pydantic.ValidationError` | Returns 422 with safe field-level detail |
| Unhandled `Exception` | Logs full traceback internally, returns generic 500 |
| FastAPI 404 (route not found) | Returns 404 with `route_not_found` |

---

## Recovery Behavior

- **Transient failures** (LLM provider, network): Retry with exponential backoff using `tenacity`. Max 3 retries.
- **Permanent failures** (invalid file, bad credentials): Do not retry. Return the appropriate 4xx immediately.
- **Ingestion failures**: Mark document as `failed` with a safe error code. Allow retry via `POST /documents/{id}/retry`.
- **Database connection errors**: Surface as 503 on the readiness endpoint. Fail fast on startup if DB is required.

---

## Logging Policy

- Log `error_code` and `request_id` at `INFO` level for handled errors.
- Log full stack trace at `ERROR` level for unhandled exceptions.
- **Never log**: passwords, JWT tokens, API keys, document content, PII.
