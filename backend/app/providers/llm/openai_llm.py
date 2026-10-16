"""OpenAI and OpenAI-compatible LLM provider adapter."""

from __future__ import annotations

import logging
from typing import Any

import httpx

from app.core.exceptions import LLMProviderError
from app.providers.llm.base import BaseLLMProvider

logger = logging.getLogger(__name__)


class OpenAILLMProvider(BaseLLMProvider):
    """Adapter for OpenAI and OpenAI-compatible Chat Completion APIs."""

    def __init__(
        self,
        model_name: str = "gpt-4o-mini",
        api_key: str = "",
        base_url: str = "",
        timeout: float = 60.0,
    ) -> None:
        self._model_name = model_name
        self._api_key = api_key
        # Default to standard OpenAI endpoint if base_url is not set
        clean_base = base_url.rstrip("/") if base_url else "https://api.openai.com/v1"
        self._endpoint = f"{clean_base}/chat/completions"
        self._timeout = timeout

    @property
    def model_name(self) -> str:
        return self._model_name

    async def generate(
        self,
        prompt: str,
        system_prompt: str | None = None,
        max_tokens: int = 1024,
        temperature: float = 0.0,
    ) -> str:
        messages: list[dict[str, str]] = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        headers: dict[str, str] = {
            "Content-Type": "application/json",
        }
        if self._api_key:
            headers["Authorization"] = f"Bearer {self._api_key}"

        payload: dict[str, Any] = {
            "model": self._model_name,
            "messages": messages,
            "max_tokens": max_tokens,
            "temperature": temperature,
        }

        try:
            async with httpx.AsyncClient(timeout=self._timeout) as client:
                response = await client.post(
                    self._endpoint,
                    headers=headers,
                    json=payload,
                )
                response.raise_for_status()
                data = response.json()
                choice = data["choices"][0]
                content: str = choice["message"]["content"]
                return content.strip()
        except httpx.HTTPStatusError as exc:
            logger.error(
                "OpenAI API returned error %s: %s", exc.response.status_code, exc.response.text
            )
            raise LLMProviderError(
                message="The AI provider returned an error while generating a response."
            ) from exc
        except (httpx.RequestError, KeyError, IndexError) as exc:
            logger.error("OpenAI API request failed: %s", type(exc).__name__)
            raise LLMProviderError(
                message="The AI provider is temporarily unreachable. Please try again."
            ) from exc
