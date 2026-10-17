"""Process-local rate limiting for authentication, chat, and uploads."""

from __future__ import annotations

import threading
import time
from collections import defaultdict, deque
from collections.abc import Awaitable, Callable
from typing import Any

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from app.core.config import get_settings


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Apply sliding-window per-IP limits to expensive or sensitive routes."""

    def __init__(self, app: Any) -> None:  # noqa: ANN401
        super().__init__(app)
        self._lock = threading.Lock()
        self._events: dict[tuple[str, str], deque[float]] = defaultdict(deque)
        self._last_cleanup = 0.0

    async def dispatch(
        self, request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        settings = get_settings()
        if settings.is_test or not settings.rate_limit_enabled:
            return await call_next(request)

        path = request.url.path
        if path in {"/api/v1/auth/login", "/api/v1/auth/register"}:
            limit = settings.auth_rate_limit_per_minute
            group = "auth"
        elif request.method == "POST" and path == "/api/v1/documents":
            limit = settings.upload_rate_limit_per_minute
            group = "upload"
        elif request.method == "POST" and (
            path in {"/api/v1/chat/query", "/api/v1/summaries/compare"}
            or path.startswith("/api/v1/summaries/documents/")
        ):
            limit = settings.api_rate_limit_per_minute
            group = "api"
        else:
            return await call_next(request)

        client_host = request.client.host if request.client else "unknown"
        key = (group, client_host)
        now = time.monotonic()
        cutoff = now - 60
        with self._lock:
            if now - self._last_cleanup >= 60:
                stale = [
                    key
                    for key, values in self._events.items()
                    if not values or values[-1] <= cutoff
                ]
                for stale_key in stale:
                    self._events.pop(stale_key, None)
                self._last_cleanup = now
            events = self._events[key]
            while events and events[0] <= cutoff:
                events.popleft()
            if len(events) >= limit:
                return JSONResponse(
                    status_code=429,
                    headers={"Retry-After": "60"},
                    content={
                        "error_code": "rate_limit_exceeded",
                        "message": "Too many requests. Please wait before trying again.",
                        "request_id": getattr(request.state, "request_id", "unknown"),
                        "detail": None,
                    },
                )
            events.append(now)
        return await call_next(request)
