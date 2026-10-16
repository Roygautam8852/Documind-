"""Application exception classes.

Define a structured exception hierarchy. All exceptions carry:
- A machine-readable error code
- A safe user-facing message
- An optional HTTP status code

Internal details (stack traces, file paths, DB errors) MUST NOT be surfaced
to the client. The API error handler in main.py maps these to safe responses.
"""

from __future__ import annotations

from typing import Any


class DocuMindError(Exception):
    """Base class for all DocuMind application errors."""

    status_code: int = 500
    error_code: str = "internal_error"
    message: str = "An unexpected error occurred."

    def __init__(
        self,
        message: str | None = None,
        error_code: str | None = None,
        status_code: int | None = None,
        detail: Any = None,  # noqa: ANN401
    ) -> None:
        self.message = message or self.__class__.message
        self.error_code = error_code or self.__class__.error_code
        self.status_code = status_code or self.__class__.status_code
        self.detail = detail  # Additional safe detail for validation errors
        super().__init__(self.message)


# ── Authentication ────────────────────────────────────────────────────────────


class AuthenticationError(DocuMindError):
    status_code = 401
    error_code = "authentication_required"
    message = "Authentication is required to access this resource."


class InvalidCredentialsError(AuthenticationError):
    error_code = "invalid_credentials"
    message = "The provided credentials are incorrect."


class TokenExpiredError(AuthenticationError):
    error_code = "token_expired"
    message = "The authentication token has expired. Please log in again."


class TokenInvalidError(AuthenticationError):
    error_code = "token_invalid"
    message = "The authentication token is invalid."


# ── Authorization ─────────────────────────────────────────────────────────────


class PermissionDeniedError(DocuMindError):
    status_code = 403
    error_code = "permission_denied"
    message = "You do not have permission to access this resource."


# ── Not Found ─────────────────────────────────────────────────────────────────


class NotFoundError(DocuMindError):
    status_code = 404
    error_code = "not_found"
    message = "The requested resource was not found."


class DocumentNotFoundError(NotFoundError):
    error_code = "document_not_found"
    message = "The requested document was not found."


class ConversationNotFoundError(NotFoundError):
    error_code = "conversation_not_found"
    message = "The requested conversation was not found."


# ── Validation ────────────────────────────────────────────────────────────────


class ValidationError(DocuMindError):
    status_code = 422
    error_code = "validation_error"
    message = "The request contains invalid data."


class FileTooLargeError(DocuMindError):
    status_code = 413
    error_code = "file_too_large"
    message = "The uploaded file exceeds the maximum allowed size."


class UnsupportedFileTypeError(DocuMindError):
    status_code = 415
    error_code = "unsupported_file_type"
    message = "The uploaded file type is not supported."


class MalformedFileError(DocuMindError):
    status_code = 422
    error_code = "malformed_file"
    message = "The uploaded file could not be read. It may be corrupted."


# ── Document Processing ───────────────────────────────────────────────────────


class DocumentNotReadyError(DocuMindError):
    status_code = 409
    error_code = "document_not_ready"
    message = "The document is still being processed. Please try again shortly."


class IngestionError(DocuMindError):
    status_code = 500
    error_code = "ingestion_failed"
    message = "Document processing failed. Please try uploading the document again."


# ── RAG / Chat ────────────────────────────────────────────────────────────────


class LLMProviderError(DocuMindError):
    status_code = 502
    error_code = "llm_provider_error"
    message = "The AI provider is temporarily unavailable. Please try again."


class EmbeddingError(DocuMindError):
    status_code = 500
    error_code = "embedding_error"
    message = "Failed to generate embeddings. Please try again."


class InsufficientEvidenceError(DocuMindError):
    """Raised internally to trigger abstention; mapped to a 200 response with abstention text."""

    status_code = 200
    error_code = "insufficient_evidence"
    message = (
        "The uploaded documents do not contain sufficient information to answer this question."
    )


# ── Rate Limiting ─────────────────────────────────────────────────────────────


class RateLimitError(DocuMindError):
    status_code = 429
    error_code = "rate_limit_exceeded"
    message = "Too many requests. Please wait before trying again."


# ── Conflict ─────────────────────────────────────────────────────────────────


class ConflictError(DocuMindError):
    status_code = 409
    error_code = "conflict"
    message = "A conflict occurred with the current state of the resource."
