"""FastAPI application factory.

This module creates and configures the FastAPI application instance including:
- CORS middleware
- Request context (unique request IDs)
- Global exception handlers
- Versioned API router

The app is imported by uvicorn as: uvicorn app.main:app
"""

from __future__ import annotations

import logging
import os
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import ValidationError as PydanticValidationError

from app.api.dependencies import CurrentUserId
from app.api.v1.router import api_router
from app.core.config import Settings, get_settings
from app.core.exceptions import DocuMindError
from app.core.logging import configure_logging
from app.core.metrics import HttpMetricsMiddleware, http_metrics
from app.core.rate_limit import RateLimitMiddleware
from app.core.request_context import RequestContextMiddleware, get_request_id

# Module-level logger (configure_logging() is called inside create_app)
logger = logging.getLogger(__name__)


# ── Lifespan ──────────────────────────────────────────────────────────────────


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan handler (startup + shutdown)."""
    settings = get_settings()
    logger.info(
        "DocuMind starting — env=%s llm_provider=%s embedding_provider=%s",
        settings.app_env,
        settings.llm_provider,
        settings.embedding_provider,
    )
    _ensure_data_dirs(settings)
    yield
    logger.info("DocuMind shutting down")


def _ensure_data_dirs(settings: Settings) -> None:
    """Create required local data directories if they don't exist."""
    for path in [settings.upload_dir, settings.chroma_persist_dir]:
        os.makedirs(path, exist_ok=True)


# ── Application factory ───────────────────────────────────────────────────────


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    settings = get_settings()
    configure_logging(level=settings.log_level, env=settings.app_env)

    app = FastAPI(
        title=settings.app_name,
        description="AI Document Intelligence Platform — REST API",
        version="0.1.0",
        docs_url="/docs" if not settings.is_production else None,
        redoc_url="/redoc" if not settings.is_production else None,
        openapi_url="/openapi.json" if not settings.is_production else None,
        lifespan=lifespan,
    )

    # ── Middleware (applied in reverse order) ─────────────────────────────────

    # 1. Request context (UUID per request)
    app.add_middleware(RateLimitMiddleware)
    app.add_middleware(RequestContextMiddleware)
    app.add_middleware(HttpMetricsMiddleware)

    # 2. CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[settings.frontend_origin],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["X-Request-ID"],
    )

    # ── Exception handlers ────────────────────────────────────────────────────

    @app.exception_handler(DocuMindError)
    async def documind_error_handler(request: Request, exc: DocuMindError) -> JSONResponse:
        request_id = get_request_id(request)
        logger.info(
            "Application error: %s — %s [request_id=%s]",
            exc.error_code,
            exc.message,
            request_id,
        )
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error_code": exc.error_code,
                "message": exc.message,
                "request_id": request_id,
                "detail": exc.detail,
            },
        )

    @app.exception_handler(PydanticValidationError)
    async def pydantic_validation_handler(
        request: Request, exc: PydanticValidationError
    ) -> JSONResponse:
        request_id = get_request_id(request)
        # Extract only field names and messages — no internal paths
        safe_detail = [
            {"field": ".".join(str(loc) for loc in err["loc"]), "msg": err["msg"]}
            for err in exc.errors()
        ]
        return JSONResponse(
            status_code=422,
            content={
                "error_code": "validation_error",
                "message": "The request contains invalid data.",
                "request_id": request_id,
                "detail": safe_detail,
            },
        )

    @app.exception_handler(RequestValidationError)
    async def request_validation_handler(
        request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        """Return validation locations without echoing submitted values."""
        request_id = get_request_id(request)
        safe_detail = [
            {
                "field": ".".join(str(loc) for loc in err.get("loc", ())),
                "msg": err.get("msg", "Invalid value."),
            }
            for err in exc.errors()
        ]
        return JSONResponse(
            status_code=422,
            content={
                "error_code": "validation_error",
                "message": "The request contains invalid data.",
                "request_id": request_id,
                "detail": safe_detail,
            },
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        request_id = get_request_id(request)
        # Log the full exception internally but return a safe message
        logger.exception(
            "Unhandled exception [request_id=%s]: %s",
            request_id,
            type(exc).__name__,
        )
        return JSONResponse(
            status_code=500,
            content={
                "error_code": "internal_error",
                "message": "An unexpected error occurred. Please try again.",
                "request_id": request_id,
                "detail": None,
            },
        )

    # ── Routes ────────────────────────────────────────────────────────────────

    app.include_router(api_router, prefix="/api/v1")

    @app.get("/metrics", tags=["observability"], summary="Request metrics snapshot")
    async def metrics_snapshot(_current_user_id: CurrentUserId) -> dict[str, object]:
        """Return process-local request counts and latency aggregates."""
        return http_metrics.snapshot()

    return app


# ── Application instance ──────────────────────────────────────────────────────

app = create_app()
