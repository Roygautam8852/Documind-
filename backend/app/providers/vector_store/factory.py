"""Vector store factory."""

from __future__ import annotations

from app.core.config import Settings, get_settings
from app.providers.vector_store.base import BaseVectorStore
from app.providers.vector_store.chroma_store import ChromaVectorStore
from app.providers.vector_store.mock_store import MockVectorStore

_store_instance: BaseVectorStore | None = None
_cached_store_type: str | None = None
_cached_persist_dir: str | None = None


def get_vector_store(settings: Settings | None = None) -> BaseVectorStore:
    """Return the configured vector store instance.

    Uses settings.vector_store ('chroma' or 'mock').
    """
    global _store_instance, _cached_store_type, _cached_persist_dir

    cfg = settings or get_settings()
    store_type = cfg.vector_store
    persist_dir = cfg.chroma_persist_dir

    if (
        _store_instance is None
        or _cached_store_type != store_type
        or _cached_persist_dir != persist_dir
    ):
        if store_type == "mock":
            _store_instance = MockVectorStore()
        elif store_type == "chroma":
            _store_instance = ChromaVectorStore(persist_directory=persist_dir)
        else:
            raise ValueError(f"Unknown vector store type: {store_type}")
        _cached_store_type = store_type
        _cached_persist_dir = persist_dir

    return _store_instance
