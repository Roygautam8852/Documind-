"""FastAPI dependencies: database session, current user, pagination."""

from __future__ import annotations

from typing import Annotated

from fastapi import Depends, Query
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AuthenticationError
from app.core.security import decode_access_token
from app.db.session import get_db

_bearer = HTTPBearer(auto_error=False)

# ── Type aliases ──────────────────────────────────────────────────────────────

DbSession = Annotated[AsyncSession, Depends(get_db)]


# ── Auth dependency ───────────────────────────────────────────────────────────


async def get_current_user_id(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
) -> str:
    """Extract and validate the JWT, returning the authenticated user's ID as a string.

    Raises:
        AuthenticationError: If no token is provided or the token is invalid.
    """
    if credentials is None:
        raise AuthenticationError()

    payload = decode_access_token(credentials.credentials)
    sub = payload.get("sub")
    if not sub:
        raise AuthenticationError()

    return str(sub)


CurrentUserId = Annotated[str, Depends(get_current_user_id)]


# ── Pagination dependency ─────────────────────────────────────────────────────


class PaginationParams:
    """Common pagination query parameters."""

    def __init__(
        self,
        page: int = Query(default=1, ge=1, description="Page number (1-indexed)"),
        page_size: int = Query(default=20, ge=1, le=100, description="Items per page"),
    ) -> None:
        self.page = page
        self.page_size = page_size

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.page_size

    @property
    def limit(self) -> int:
        return self.page_size


Pagination = Annotated[PaginationParams, Depends(PaginationParams)]
