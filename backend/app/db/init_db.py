"""Database initialization helpers.

Used during development setup and testing. Production schema changes
must go through Alembic migrations (see docs/DATABASE_MIGRATIONS.md).
"""

from __future__ import annotations

import logging

from sqlalchemy.ext.asyncio import AsyncEngine

# Import all models so Base.metadata knows about them
from app.db.base import Base
from app.models import chunk, conversation, document, message, user  # noqa: F401

logger = logging.getLogger(__name__)


async def create_all_tables(engine: AsyncEngine) -> None:
    """Create all tables that don't yet exist.

    WARNING: Use only for development/testing. Use Alembic for production.
    """
    logger.warning("Creating tables directly via create_all — use Alembic migrations in production")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def drop_all_tables(engine: AsyncEngine) -> None:
    """Drop all application tables.

    WARNING: Destructive. Use only in tests.
    """
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
