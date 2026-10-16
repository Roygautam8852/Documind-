"""Alembic migration environment configuration.

This file configures Alembic's migration context so it can:
1. Find the application's database URL from settings.
2. Import all models for autogenerate support.
3. Support both offline (SQL generation) and online (live DB) migration modes.
"""

from __future__ import annotations

import asyncio
from logging.config import fileConfig
from typing import Any

from alembic import context

# Load application config
from app.core.config import get_settings

# Import Base and all models so autogenerate can detect them
from app.db.base import Base
from app.models import Chunk, Conversation, Document, Message, User  # noqa: F401
from sqlalchemy.ext.asyncio import create_async_engine

# Alembic config object
config = context.config

# Interpret the alembic.ini logging config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Point Alembic at the application's metadata
target_metadata = Base.metadata


def get_url() -> str:
    """Return the database URL from application settings."""
    return get_settings().database_url


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode (generate SQL without a live connection)."""
    url = get_url()
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Any) -> None:
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


async def run_migrations_online() -> None:
    """Run migrations in 'online' mode (live database connection)."""
    engine = create_async_engine(get_url(), echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(do_run_migrations)
    await engine.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    asyncio.run(run_migrations_online())
