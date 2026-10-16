"""Factory for creating and caching reranker provider instances."""

from __future__ import annotations

import logging

from app.core.config import Settings, get_settings
from app.providers.reranker.base import BaseReranker
from app.providers.reranker.cross_encoder_reranker import CrossEncoderReranker
from app.providers.reranker.mock_reranker import MockReranker

logger = logging.getLogger(__name__)

_reranker_instance: BaseReranker | None = None
_cached_provider_name: str | None = None


def get_reranker(settings: Settings | None = None) -> BaseReranker | None:
    """Return the configured reranker provider singleton, or None if disabled."""
    global _reranker_instance, _cached_provider_name

    cfg = settings or get_settings()
    provider_name = cfg.reranker_provider

    if provider_name == "none":
        return None

    if _reranker_instance is not None and _cached_provider_name == provider_name:
        return _reranker_instance

    if provider_name == "mock":
        logger.info("Initializing MockReranker")
        _reranker_instance = MockReranker()
    elif provider_name == "cross_encoder":
        logger.info("Initializing CrossEncoderReranker with model %s", cfg.reranker_model)
        _reranker_instance = CrossEncoderReranker(model_name=cfg.reranker_model)
    else:
        logger.warning("Unknown reranker_provider %r; defaulting to None", provider_name)
        return None

    _cached_provider_name = provider_name
    return _reranker_instance
