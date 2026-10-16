"""Common Pydantic schemas shared across the API."""

from __future__ import annotations

from typing import Any, Generic, TypeVar

from pydantic import BaseModel, Field

T = TypeVar("T")


class ErrorResponse(BaseModel):
    """Standard error response returned by all error handlers."""

    error_code: str = Field(..., description="Machine-readable error identifier")
    message: str = Field(..., description="Human-readable error description")
    request_id: str = Field(..., description="Request ID for tracing")
    detail: Any | None = Field(default=None, description="Optional safe validation detail")


class PaginatedResponse(BaseModel, Generic[T]):
    """Generic paginated list response."""

    items: list[T]
    total: int
    page: int
    page_size: int
    has_next: bool

    @classmethod
    def from_items(
        cls,
        items: list[T],
        total: int,
        page: int,
        page_size: int,
    ) -> PaginatedResponse[T]:
        return cls(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
            has_next=(page * page_size) < total,
        )


class HealthResponse(BaseModel):
    """Response for GET /health."""

    status: str
    version: str
    app_name: str


class ReadinessResponse(BaseModel):
    """Response for GET /ready."""

    status: str
    database: str
    version: str
