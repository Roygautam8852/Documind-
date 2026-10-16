"""Health and readiness check endpoints.

GET /health — basic liveness check, always returns 200 when the app is up.
GET /ready  — readiness check, returns 200 only when the database is reachable.
"""

from __future__ import annotations

import logging

from fastapi import APIRouter
from fastapi.responses import JSONResponse
from sqlalchemy import text

from app.core.config import get_settings
from app.db.session import get_db
from app.schemas.common import HealthResponse, ReadinessResponse

router = APIRouter(tags=["health"])
logger = logging.getLogger(__name__)

_VERSION = "0.1.0"


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="Liveness check",
    description="Returns 200 OK when the application process is running.",
)
async def health() -> HealthResponse:
    settings = get_settings()
    return HealthResponse(
        status="ok",
        version=_VERSION,
        app_name=settings.app_name,
    )


@router.get(
    "/ready",
    summary="Readiness check",
    description="Returns 200 OK when ready to serve traffic (database reachable).",
)
async def ready() -> JSONResponse:
    # Check database connectivity
    db_status = "ok"
    try:
        async for session in get_db():
            await session.execute(text("SELECT 1"))
            break
    except Exception as exc:
        logger.warning("Readiness check: database unreachable — %s", exc)
        db_status = "unavailable"

    overall_ok = db_status == "ok"
    payload = ReadinessResponse(
        status="ready" if overall_ok else "not_ready",
        database=db_status,
        version=_VERSION,
    )

    return JSONResponse(
        content=payload.model_dump(),
        status_code=200 if overall_ok else 503,
    )
