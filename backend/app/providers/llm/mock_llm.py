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
        prompt_lower = prompt.lower()

        if "compare" in prompt_lower or "comparison" in prompt_lower:
            return (
                f"### Cross-Document Comparison\n\n"
                f"Both documents address key domain standards [{primary_source}].\n\n"
                f"### Key Similarities\n\n"
                f"- Both documents establish standard protocols [{primary_source}].\n\n"
                f"### Key Differences\n\n"
                f"- The initial documentation outlines primary architecture [{primary_source}], "
                f"whereas subsequent material focuses on guidelines [{secondary_source}]."
            )

        if "summar" in prompt_lower:
            if "executive" in prompt_lower:
                return (
                    f"### Executive Summary\n\n"
                    f"This document provides verified technical specifications "
                    f"and operational standards [{primary_source}].\n\n"
                    f"### Key Highlights\n\n"
                    f"- Primary criteria and foundational definitions are established "
                    f"in [{primary_source}].\n"
                    f"- Implementation procedures and requirements are detailed "
                    f"in [{secondary_source}]."
                )
            if "detailed" in prompt_lower:
                return (
                    f"### Detailed Breakdown\n\n"
                    f"#### Section 1: Overview\n"
                    f"The document introduces foundational principles and "
                    f"operational scopes [{primary_source}].\n\n"
                    f"#### Section 2: Specifications\n"
                    f"Technical requirements and execution standards are documented "
                    f"in detail [{secondary_source}]."
                )
            if "bullet" in prompt_lower:
                return (
                    f"### Key Takeaways\n\n"
                    f"- Core requirements and operational guidelines are established "
                    f"in [{primary_source}].\n"
                    f"- System configurations and procedural details are elaborated "
                    f"in [{secondary_source}]."
                )
            return (
                f"### Executive Summary\n\n"
                f"This document provides verified technical specifications "
                f"and operational standards [{primary_source}].\n\n"
                f"### Key Highlights\n\n"
                f"- Primary criteria and foundational definitions are established "
                f"in [{primary_source}].\n"
                f"- Implementation procedures and requirements are detailed "
                f"in [{secondary_source}]."
            )

        return (
            f"Based on the provided documentation, the requested information is verified "
            f"directly in the source material [{primary_source}]. "
            f"Key operational details are further elaborated in [{secondary_source}]."
        )
