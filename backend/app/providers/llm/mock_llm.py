"""Deterministic Mock LLM provider for zero-dependency offline testing."""

from __future__ import annotations

import re

from app.providers.llm.base import BaseLLMProvider

_SOURCE_PATTERN = re.compile(r"\[Source (S\d+)\]")
ABSTENTION_TEXT = (
    "The uploaded documents do not contain sufficient information to answer this question."
)


class MockLLMProvider(BaseLLMProvider):
    """Deterministic LLM provider generating citations from input evidence."""

    def __init__(
        self,
        model_name: str = "mock-gpt-4o-mini",
        canned_response: str | None = None,
    ) -> None:
        self._model_name = model_name
        self.canned_response = canned_response

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
        if self.canned_response is not None:
            return self.canned_response

        # Detect sources available in the prompt evidence
        sources = _SOURCE_PATTERN.findall(prompt)
        if not sources:
            return ABSTENTION_TEXT

        # Generate a coherent grounded answer citing available sources
        primary_source = sources[0]
        secondary_source = sources[1] if len(sources) > 1 else primary_source
        return (
            f"Based on the provided documentation, the requested information is verified "
            f"directly in the source material [{primary_source}]. "
            f"Key operational details are further elaborated in [{secondary_source}]."
        )
