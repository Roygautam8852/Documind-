"""Small in-process HTTP metrics for health and operational visibility."""

from __future__ import annotations

import threading
from collections import defaultdict
from collections.abc import Awaitable, Callable
from time import perf_counter
from typing import Any

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response


class HttpMetrics:
    """Aggregate request counts and latency without retaining request data."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._counts: dict[tuple[str, str, int], int] = defaultdict(int)
        self._latencies: dict[tuple[str, str], list[float]] = defaultdict(list)

    def observe(self, method: str, route: str, status: int, duration_ms: float) -> None:
        key = (method, route, status)
        with self._lock:
            self._counts[key] += 1
            self._latencies[(method, route)].append(duration_ms)

    def snapshot(self) -> dict[str, Any]:
        with self._lock:
            return {
                "requests": [
                    {"method": method, "route": route, "status": status, "count": count}
                    for (method, route, status), count in sorted(self._counts.items())
                ],
                "latency_ms": [
                    {
                        "method": method,
                        "route": route,
                        "count": len(values),
                        "mean": round(sum(values) / len(values), 2),
                        "max": round(max(values), 2),
                    }
                    for (method, route), values in sorted(self._latencies.items())
                    if values
                ],
            }


http_metrics = HttpMetrics()


class HttpMetricsMiddleware(BaseHTTPMiddleware):
    """Record method, route template, status and elapsed time per request."""

    async def dispatch(
        self, request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        started = perf_counter()
        response = await call_next(request)
        duration_ms = (perf_counter() - started) * 1000
        route = getattr(request.scope.get("route"), "path", "unmatched")
        http_metrics.observe(request.method, route, response.status_code, duration_ms)
        return response
