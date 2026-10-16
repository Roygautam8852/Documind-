"""Request context middleware.

Attaches a unique request ID to every HTTP request. The ID is:
- Generated server-side (UUID4) if not provided by the client.
- Attached to the response via the X-Request-ID header.
- Available in the request state for logging and error responses.
"""

from __future__ import annotations

import uuid
from typing import Any

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

REQUEST_ID_HEADER = "X-Request-ID"


class RequestContextMiddleware(BaseHTTPMiddleware):
    """Middleware that assigns and propagates a unique request ID."""

    async def dispatch(self, request: Request, call_next: Any) -> Response:  # noqa: ANN401  # type: ignore[override]
        request_id = request.headers.get(REQUEST_ID_HEADER) or str(uuid.uuid4())
        request.state.request_id = request_id

        response = await call_next(request)
        response.headers[REQUEST_ID_HEADER] = request_id
        return response


def get_request_id(request: Request) -> str:
    """Return the request ID from the request state, or a fallback."""
    return getattr(request.state, "request_id", "unknown")
