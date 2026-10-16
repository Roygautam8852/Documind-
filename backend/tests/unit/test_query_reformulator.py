"""Unit tests for conversational query reformulation."""

from __future__ import annotations

from app.rag.query_reformulator import QueryReformulator


def test_query_reformulator_standalone_query_unchanged() -> None:
    query = "What is the primary architecture of the DocuMind platform?"
    # No history -> unchanged
    assert QueryReformulator.reformulate(query, None) == query
    assert QueryReformulator.reformulate(query, []) == query


def test_query_reformulator_resolves_anaphora_with_history() -> None:
    history = [
        ("user", "Tell me about the AES-256 encryption standard"),
        ("assistant", "AES-256 is an advanced symmetric cipher requiring a 256-bit key."),
    ]

    follow_up = "How does it protect data at rest?"
    reformulated = QueryReformulator.reformulate(follow_up, history)

    # Should incorporate the subject from previous turn
    assert "AES-256 encryption standard" in reformulated
    assert "How does it protect data at rest?" in reformulated


def test_query_reformulator_handles_short_followups() -> None:
    history = [
        ("user", "Explain Chroma vector database"),
        ("assistant", "Chroma stores high-dimensional embeddings."),
    ]

    short_q = "And why?"
    reformulated = QueryReformulator.reformulate(short_q, history)

    assert "Chroma vector database" in reformulated
    assert "And why?" in reformulated
