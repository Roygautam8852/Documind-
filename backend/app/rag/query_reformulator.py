"""Conversational query reformulation for multi-turn coreference resolution."""

from __future__ import annotations

import re
from collections.abc import Sequence

# Pronouns and anaphoric references signaling coreference to prior context
_COREFERENCE_PATTERNS = re.compile(
    r"\b(it|its|they|them|their|this|that|these|those|the former|the latter|the same|such)\b",
    re.IGNORECASE,
)
_SHORT_FOLLOWUP_PATTERNS = re.compile(
    r"^(and\b|how\s+about\b|what\s+about\b|why\b|tell\s+me\s+more\b|elaborate\b|more\s+details\b|can\s+you\s+explain\b)",
    re.IGNORECASE,
)


class QueryReformulator:
    """Reformulate follow-up questions into standalone queries using conversation history."""

    @staticmethod
    def needs_reformulation(question: str) -> bool:
        """Check whether the question contains anaphoric pronouns or follow-up phrasing."""
        stripped = question.strip()
        if len(stripped.split()) <= 4:
            return True
        if _SHORT_FOLLOWUP_PATTERNS.search(stripped):
            return True
        if _COREFERENCE_PATTERNS.search(stripped):
            return True
        return False

    @classmethod
    def reformulate(
        cls,
        question: str,
        conversation_history: Sequence[tuple[str, str]] | None = None,
    ) -> str:
        """Reformulate a follow-up question using preceding conversational turns.

        Args:
            question: Current user question.
            conversation_history: List of (role, content) previous turns.

        Returns:
            Disambiguated search query for semantic and lexical retrieval.
        """
        if not conversation_history:
            return question.strip()

        if not cls.needs_reformulation(question):
            return question.strip()

        # Find latest user question and assistant answer
        last_user_query = ""
        last_assistant_snippet = ""

        for role, text in reversed(conversation_history):
            if role == "user" and not last_user_query:
                last_user_query = text.strip()
            elif role == "assistant" and not last_assistant_snippet:
                # Take the first sentence/keywords of previous assistant answer
                first_sentence = text.strip().split(".")[0]
                last_assistant_snippet = first_sentence[:100].strip()

            if last_user_query and last_assistant_snippet:
                break

        if not last_user_query:
            return question.strip()

        # Combine context: [prior user topic] + [current question]
        clean_current = question.strip()
        clean_prior = last_user_query.rstrip("?.!")

        # If current question already starts with what/how/etc, append prior subject
        reformulated = f"{clean_prior}: {clean_current}"
        return reformulated
