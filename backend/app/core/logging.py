"""Structured logging configuration for DocuMind.

Configures Python's standard logging to emit JSON-compatible structured logs
in production, and human-readable colored output in development.

NEVER log: passwords, JWT secrets, API keys, raw document content, or PII.
"""

from __future__ import annotations

import logging
import sys
from typing import Any


def configure_logging(level: str = "INFO", env: str = "development") -> None:
    """Configure application-wide structured logging.

    Call this once at application startup before creating any loggers.
    """
    log_level = getattr(logging, level.upper(), logging.INFO)

    # Root handler
    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(log_level)

    if env == "production":
        formatter = _JsonFormatter()
    else:
        formatter = logging.Formatter(
            fmt="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
            datefmt="%Y-%m-%dT%H:%M:%S",
        )

    handler.setFormatter(formatter)

    # Configure root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(log_level)
    root_logger.handlers.clear()
    root_logger.addHandler(handler)

    # Quiet noisy third-party loggers
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
    logging.getLogger("chromadb").setLevel(logging.WARNING)
    logging.getLogger("sentence_transformers").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)


def get_logger(name: str) -> logging.Logger:
    """Return a named logger for the given module."""
    return logging.getLogger(name)


class _JsonFormatter(logging.Formatter):
    """Minimal JSON-line formatter for structured production logging."""

    def format(self, record: logging.LogRecord) -> str:
        import json
        import traceback

        data: dict[str, Any] = {
            "time": self.formatTime(record, "%Y-%m-%dT%H:%M:%SZ"),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }

        if record.exc_info:
            data["exc"] = traceback.format_exception(*record.exc_info)

        # Carry structured extra fields if provided
        for key in ("request_id", "user_id", "document_id", "duration_ms"):
            if hasattr(record, key):
                data[key] = getattr(record, key)

        return json.dumps(data, default=str)
