"""Cross-encoder neural reranker using SentenceTransformers."""

from __future__ import annotations

import asyncio
from collections.abc import Sequence
from typing import TYPE_CHECKING

from app.providers.reranker.base import BaseReranker
from app.providers.vector_store.base import VectorSearchResult

if TYPE_CHECKING:
    from sentence_transformers import CrossEncoder


class CrossEncoderReranker(BaseReranker):
    """Neural cross-encoder scoring query-passage pairs."""

    def __init__(self, model_name: str = "cross-encoder/ms-marco-MiniLM-L-6-v2") -> None:
        self.model_name = model_name
        self._model: CrossEncoder | None = None

    def _get_model(self) -> CrossEncoder:
        if self._model is None:
            from sentence_transformers import CrossEncoder

            self._model = CrossEncoder(self.model_name)
        return self._model

    async def rerank(
        self,
        query: str,
        candidates: Sequence[VectorSearchResult],
        top_k: int = 5,
    ) -> list[VectorSearchResult]:
        if not candidates:
            return []

        model = self._get_model()
        pairs = [[query, c.text] for c in candidates]

        # Run model inference in thread pool to avoid blocking the async event loop
        scores = await asyncio.to_thread(model.predict, pairs)

        scored = list(zip(candidates, scores, strict=False))
        scored.sort(key=lambda x: x[1], reverse=True)

        results: list[VectorSearchResult] = []
        for c, score in scored[:top_k]:
            results.append(
                VectorSearchResult(
                    chunk_id=c.chunk_id,
                    document_id=c.document_id,
                    owner_id=c.owner_id,
                    text=c.text,
                    score=float(score),
                    page_number=c.page_number,
                    chunk_index=c.chunk_index,
                    metadata=dict(c.metadata or {}),
                )
            )

        return results
