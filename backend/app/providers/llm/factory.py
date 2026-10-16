"""LLM provider factory."""

from __future__ import annotations

from app.core.config import Settings, get_settings
from app.providers.llm.base import BaseLLMProvider
from app.providers.llm.mock_llm import MockLLMProvider
from app.providers.llm.openai_llm import OpenAILLMProvider

_provider_instance: BaseLLMProvider | None = None
_cached_provider_type: str | None = None
_cached_model_name: str | None = None


def get_llm_provider(settings: Settings | None = None) -> BaseLLMProvider:
    """Return the configured LLM provider instance.

    Uses settings.llm_provider ('openai', 'mock', etc.).
    """
    global _provider_instance, _cached_provider_type, _cached_model_name

    cfg = settings or get_settings()
    provider_type = cfg.llm_provider
    model_name = cfg.llm_model

    if (
        _provider_instance is None
        or _cached_provider_type != provider_type
        or _cached_model_name != model_name
    ):
        if provider_type == "mock":
            _provider_instance = MockLLMProvider(model_name=model_name)
        elif provider_type in ("openai", "anthropic", "google"):
            _provider_instance = OpenAILLMProvider(
                model_name=model_name,
                api_key=cfg.llm_api_key,
                base_url=cfg.llm_base_url,
            )
        else:
            raise ValueError(f"Unknown LLM provider: {provider_type}")

        _cached_provider_type = provider_type
        _cached_model_name = model_name

    return _provider_instance
