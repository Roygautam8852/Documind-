"""Unit tests for LLM providers (MockLLMProvider, OpenAILLMProvider) and factory."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest
from app.core.config import Settings
from app.core.exceptions import LLMProviderError
from app.providers.llm.factory import get_llm_provider
from app.providers.llm.mock_llm import ABSTENTION_TEXT, MockLLMProvider
from app.providers.llm.openai_llm import OpenAILLMProvider


@pytest.mark.asyncio
async def test_mock_llm_provider_grounded_answer() -> None:
    provider = MockLLMProvider(model_name="mock-model")
    assert provider.model_name == "mock-model"

    prompt_with_sources = (
        "Retrieved Evidence:\n"
        "[Source S1]\nDoc: a.txt\nText: Info\n\n"
        "[Source S2]\nDoc: b.txt\nText: More info"
    )
    answer = await provider.generate(prompt=prompt_with_sources)
    assert "[S1]" in answer
    assert "[S2]" in answer


@pytest.mark.asyncio
async def test_mock_llm_provider_abstains_without_sources() -> None:
    provider = MockLLMProvider()
    answer = await provider.generate(prompt="Question without any evidence blocks")
    assert answer == ABSTENTION_TEXT


@pytest.mark.asyncio
async def test_mock_llm_provider_canned_response() -> None:
    provider = MockLLMProvider(canned_response="Custom canned answer [S99].")
    answer = await provider.generate(prompt="Any prompt")
    assert answer == "Custom canned answer [S99]."


@pytest.mark.asyncio
async def test_openai_llm_provider_success() -> None:
    provider = OpenAILLMProvider(
        model_name="gpt-4o-mini",
        api_key="sk-test",
        base_url="https://api.openai.com/v1",
    )

    mock_resp = MagicMock()
    mock_resp.json.return_value = {
        "choices": [{"message": {"content": "This is a grounded completion [S1]."}}]
    }
    mock_resp.raise_for_status = MagicMock()

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_resp
        result = await provider.generate(
            prompt="User question with evidence",
            system_prompt="You are DocuMind.",
        )
        assert result == "This is a grounded completion [S1]."
        mock_post.assert_awaited_once()


@pytest.mark.asyncio
async def test_openai_llm_provider_http_error_raises_llm_error() -> None:
    provider = OpenAILLMProvider(model_name="gpt-4o-mini", api_key="sk-test")

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.side_effect = httpx.HTTPStatusError(
            message="Rate limit exceeded",
            request=MagicMock(),
            response=MagicMock(status_code=429, text="Rate limit"),
        )
        with pytest.raises(LLMProviderError):
            await provider.generate(prompt="Question")


@pytest.mark.asyncio
async def test_openai_llm_provider_network_error_raises_llm_error() -> None:
    provider = OpenAILLMProvider(model_name="gpt-4o-mini", api_key="sk-test")

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.side_effect = httpx.ConnectTimeout("Connection timed out")
        with pytest.raises(LLMProviderError):
            await provider.generate(prompt="Question")


def test_llm_provider_factory() -> None:
    mock_settings = MagicMock(spec=Settings)
    mock_settings.llm_provider = "mock"
    mock_settings.llm_model = "test-mock-model"

    provider1 = get_llm_provider(mock_settings)
    assert isinstance(provider1, MockLLMProvider)
    assert provider1.model_name == "test-mock-model"

    openai_settings = MagicMock(spec=Settings)
    openai_settings.llm_provider = "openai"
    openai_settings.llm_model = "gpt-4o"
    openai_settings.llm_api_key = "sk-key"
    openai_settings.llm_base_url = ""

    provider2 = get_llm_provider(openai_settings)
    assert isinstance(provider2, OpenAILLMProvider)
    assert provider2.model_name == "gpt-4o"

    bad_settings = MagicMock(spec=Settings)
    bad_settings.llm_provider = "invalid_llm"
    bad_settings.llm_model = "foo"
    with pytest.raises(ValueError, match="Unknown LLM provider"):
        get_llm_provider(bad_settings)
