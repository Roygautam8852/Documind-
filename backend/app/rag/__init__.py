"""RAG (Retrieval-Augmented Generation) pipeline modules."""

from __future__ import annotations

from app.rag.abstention import ABSTENTION_MESSAGE, should_abstain
from app.rag.citation_service import CitationService
from app.rag.pipeline import query_rag
from app.rag.prompt_builder import PromptBuilder

__all__ = [
    "ABSTENTION_MESSAGE",
    "CitationService",
    "PromptBuilder",
    "query_rag",
    "should_abstain",
]
