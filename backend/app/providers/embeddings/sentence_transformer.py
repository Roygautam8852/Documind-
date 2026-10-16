"""SentenceTransformer embedding provider adapter."""

from __future__ import annotations

import logging
from typing import Any

from app.providers.embeddings.base import BaseEmbeddingProvider

logger = logging.getLogger(__name__)


class SentenceTransformerEmbeddingProvider(BaseEmbeddingProvider):
    """SentenceTransformers adapter for local embedding generation.

    The model is loaded lazily on the first embedding call to ensure application
    startup remains instantaneous and does not block on model weights.
    """

    def __init__(self, model_name: str = "all-MiniLM-L6-v2", dimension: int = 384) -> None:
        self._model_name = model_name
        self._dimension = dimension
        self._model: Any = None

    @property
    def dimension(self) -> int:
        return self._dimension

    @property
    def model_name(self) -> str:
        return self._model_name

    def _get_model(self) -> Any:  # noqa: ANN401
        if self._model is None:
            try:
                from sentence_transformers import SentenceTransformer  # lazy import
            except ImportError as exc:
                raise RuntimeError(
                    "sentence-transformers is not installed. Run: pip install sentence-transformers"
                ) from exc

            logger.info("Loading SentenceTransformer model: %s", self._model_name)
            self._model = SentenceTransformer(self._model_name)
        return self._model

    async def embed_texts(self, texts: list[str]) -> list[list[float]]:
        if not texts:
            return []
        model = self._get_model()
        embeddings = model.encode(texts, normalize_embeddings=True, show_progress_bar=False)
        return [e.tolist() for e in embeddings]

    async def embed_query(self, query: str) -> list[float]:
        model = self._get_model()
        embedding = model.encode(query, normalize_embeddings=True, show_progress_bar=False)
        return embedding.tolist()
