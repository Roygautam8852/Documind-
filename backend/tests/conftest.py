"""Shared pytest fixtures for DocuMind backend tests."""

from __future__ import annotations

import os
import tempfile

import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

# ── Set test environment BEFORE any application code is imported ──────────────
# Use setitem (not setdefault) so CI env vars don't bleed in
_tmp = tempfile.gettempdir()
os.environ["APP_ENV"] = "test"
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///:memory:"
os.environ["JWT_SECRET"] = "test-secret-key-for-pytest-32chars!!"
os.environ["LLM_PROVIDER"] = "mock"
os.environ["EMBEDDING_PROVIDER"] = "mock"
os.environ["VECTOR_STORE"] = "chroma"
os.environ["CHROMA_PERSIST_DIR"] = os.path.join(_tmp, "test_chroma")
os.environ["UPLOAD_DIR"] = os.path.join(_tmp, "test_uploads")
os.environ["FRONTEND_ORIGIN"] = "http://localhost:5173"

from app.core.config import get_settings  # noqa: E402
from app.db.base import Base  # noqa: E402
from app.db.session import get_db  # noqa: E402
from app.main import app  # noqa: E402

# Clear cached settings so they reload from the env vars set above
get_settings.cache_clear()


@pytest_asyncio.fixture(scope="session")
async def engine():
    """Create an in-memory SQLite engine for the test session."""
    _engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        echo=False,
    )
    async with _engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield _engine
    async with _engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await _engine.dispose()


@pytest_asyncio.fixture
async def db_session(engine) -> AsyncSession:
    """Yield a transactional test database session, rolled back after each test."""
    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    async with session_factory() as session:
        yield session
        await session.rollback()


@pytest_asyncio.fixture
async def client(db_session: AsyncSession) -> AsyncClient:
    """Yield an async test client with the DB dependency overridden."""

    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as ac:
        yield ac

    app.dependency_overrides.clear()
