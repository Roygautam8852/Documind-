"""SQLAlchemy declarative base.

All ORM models must inherit from Base defined here so that Alembic's
autogenerate can discover them when imported through alembic/env.py.

Cross-dialect note: Models use generic SQLAlchemy types (JSON, String for UUIDs)
so that the SQLite-based test suite works without modification. PostgreSQL-specific
types (JSONB, native UUID) can be introduced in a targeted migration if needed.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, String, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    """Shared declarative base for all DocuMind models."""


class TimestampMixin:
    """Mixin that adds created_at and updated_at columns."""

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=lambda: datetime.now(tz=timezone.utc),
        nullable=False,
    )


class UUIDPrimaryKeyMixin:
    """Mixin that adds a UUID primary key stored as a 36-char string.

    Stored as String(36) for cross-dialect compatibility (SQLite in tests,
    PostgreSQL in production). Values are always UUID4 strings generated
    server-side.
    """

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
        nullable=False,
    )
