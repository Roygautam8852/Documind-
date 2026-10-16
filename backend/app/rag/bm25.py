"""BM25 lexical retrieval engine for keyword-based search over document chunks."""

from __future__ import annotations

import math
import re
from collections import Counter
from collections.abc import Sequence

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.chunk import Chunk
from app.providers.vector_store.base import VectorSearchResult

# Minimal stop words set to avoid term-frequency distortion on common grammatical words
STOP_WORDS: set[str] = {
    "a",
    "about",
    "above",
    "after",
    "again",
    "against",
    "all",
    "am",
    "an",
    "and",
    "any",
    "are",
    "aren't",
    "as",
    "at",
    "be",
    "because",
    "been",
    "before",
    "being",
    "below",
    "between",
    "both",
    "but",
    "by",
    "can",
    "can't",
    "cannot",
    "could",
    "did",
    "do",
    "does",
    "doing",
    "down",
    "during",
    "each",
    "few",
    "for",
    "from",
    "further",
    "had",
    "has",
    "have",
    "having",
    "he",
    "her",
    "here",
    "hers",
    "herself",
    "him",
    "himself",
    "his",
    "how",
    "i",
    "if",
    "in",
    "into",
    "is",
    "isn't",
    "it",
    "its",
    "itself",
    "me",
    "more",
    "most",
    "my",
    "myself",
    "no",
    "nor",
    "not",
    "of",
    "off",
    "on",
    "once",
    "only",
    "or",
    "other",
    "ought",
    "our",
    "ours",
    "ourselves",
    "out",
    "over",
    "own",
    "same",
    "she",
    "should",
    "so",
    "some",
    "such",
    "than",
    "that",
    "the",
    "their",
    "theirs",
    "them",
    "themselves",
    "then",
    "there",
    "these",
    "they",
    "this",
    "those",
    "through",
    "to",
    "too",
    "under",
    "until",
    "up",
    "very",
    "was",
    "wasn't",
    "we",
    "were",
    "what",
    "when",
    "where",
    "which",
    "while",
    "who",
    "whom",
    "why",
    "with",
    "would",
    "you",
    "your",
    "yours",
    "yourself",
    "yourselves",
}

_WORD_PATTERN = re.compile(r"\b[a-zA-Z0-9_\-\.]+\b")


def tokenize(text: str) -> list[str]:
    """Extract lowercase alphanumeric tokens from text, filtering stopwords."""
    words = _WORD_PATTERN.findall(text.lower())
    return [w for w in words if len(w) > 1 and w not in STOP_WORDS]


class BM25Retriever:
    """In-memory BM25 scorer operating on chunks queried from the database."""

    def __init__(self, k1: float = 1.5, b: float = 0.75) -> None:
        self.k1 = k1
        self.b = b

    async def search(
        self,
        db: AsyncSession,
        query: str,
        owner_id: str,
        document_ids: Sequence[str] | None = None,
        top_k: int = 5,
    ) -> list[VectorSearchResult]:
        """Perform BM25 search over user chunks.

        Args:
            db: Active async database session.
            query: User's question or search query string.
            owner_id: Owning user ID for multi-tenant isolation.
            document_ids: Optional document ID filtering.
            top_k: Maximum number of chunks to return.

        Returns:
            Ranked list of VectorSearchResult objects with normalized BM25 scores.
        """
        query_tokens = tokenize(query)
        if not query_tokens:
            return []

        # 1. Fetch chunks owned by user with optional document filters
        stmt = select(Chunk).where(Chunk.owner_id == owner_id)
        if document_ids:
            stmt = stmt.where(Chunk.document_id.in_(document_ids))

        res = await db.execute(stmt)
        chunks = list(res.scalars().all())
        if not chunks:
            return []

        # 2. Tokenize chunks
        chunk_docs: list[tuple[Chunk, list[str]]] = []
        for c in chunks:
            tokens = tokenize(c.text)
            chunk_docs.append((c, tokens))

        n_docs = len(chunk_docs)
        avgdl = sum(len(t) for _, t in chunk_docs) / max(n_docs, 1)

        # 3. Document frequency for query terms
        doc_freq: dict[str, int] = Counter()
        for _, tokens in chunk_docs:
            unique_terms = set(tokens)
            for qt in query_tokens:
                if qt in unique_terms:
                    doc_freq[qt] += 1

        # 4. Compute BM25 scores
        scored_chunks: list[tuple[Chunk, float]] = []
        for chunk, tokens in chunk_docs:
            if not tokens:
                continue

            tf = Counter(tokens)
            doc_len = len(tokens)
            score = 0.0

            for qt in query_tokens:
                n_q = doc_freq.get(qt, 0)
                if n_q == 0:
                    continue

                # Standard Okapi BM25 formula
                idf = math.log(1.0 + (n_docs - n_q + 0.5) / (n_q + 0.5))
                freq = tf[qt]
                numerator = freq * (self.k1 + 1.0)
                denominator = freq + self.k1 * (1.0 - self.b + self.b * (doc_len / avgdl))
                score += idf * (numerator / denominator)

            if score > 0.0:
                scored_chunks.append((chunk, score))

        if not scored_chunks:
            return []

        # 5. Sort descending
        scored_chunks.sort(key=lambda x: x[1], reverse=True)

        # Normalize score into [0, 1] relative to the top hit
        max_score = scored_chunks[0][1]
        results: list[VectorSearchResult] = []

        for chunk, raw_score in scored_chunks[:top_k]:
            normalized_score = min(1.0, max(0.01, raw_score / max_score))
            results.append(
                VectorSearchResult(
                    chunk_id=chunk.id,
                    document_id=chunk.document_id,
                    owner_id=chunk.owner_id,
                    text=chunk.text,
                    score=normalized_score,
                    page_number=chunk.page_number,
                    chunk_index=chunk.chunk_index,
                    metadata=dict(chunk.chunk_metadata or {}),
                )
            )

        return results
