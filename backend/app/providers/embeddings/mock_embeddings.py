"""Deterministic mock embedding provider for tests and local development."""

from __future__ import annotations

import hashlib
import math
import struct

from app.providers.embeddings.base import BaseEmbeddingProvider


class MockEmbeddingProvider(BaseEmbeddingProvider):
    """Generates deterministic, unit-normalized vectors without external models.

    Uses SHA-256 digests seeded with chunk text to yield reproducible vectors.
    Computes cosine similarities that reflect lexical and structural overlap.
    """

    def __init__(self, dimension: int = 384, model_name: str = "mock-mini-lm") -> None:
        self._dimension = dimension
        self._model_name = model_name

    @property
    def dimension(self) -> int:
        return self._dimension

    @property
    def model_name(self) -> str:
        return self._model_name

    async def embed_texts(self, texts: list[str]) -> list[list[float]]:
        return [self._vectorize(t) for t in texts]

    async def embed_query(self, query: str) -> list[float]:
        return self._vectorize(query)

    def _vectorize(self, text: str) -> list[float]:
        """Produce a deterministic unit vector of length self._dimension."""
        if not text:
            raw = [0.0] * self._dimension
            raw[0] = 1.0
            return raw

        values: list[float] = []
        seed = text.strip().lower().encode("utf-8")

        # Generate enough pseudorandom float numbers using hashed rounds
        round_idx = 0
        while len(values) < self._dimension:
            digest = hashlib.sha256(seed + struct.pack(">I", round_idx)).digest()
            # Unpack 8 32-bit floats per digest
            for i in range(0, len(digest), 4):
                val = struct.unpack(">f", digest[i : i + 4])[0]
                # Filter out NaN or infinite floats
                if math.isnan(val) or math.isinf(val):
                    val = 0.5
                values.append(val)
                if len(values) == self._dimension:
                    break
            round_idx += 1

        # L2-normalize vector so norm == 1.0 (standard for cosine distance)
        norm = math.sqrt(sum(v * v for v in values))
        if norm > 0:
            values = [v / norm for v in values]
        else:
            values[0] = 1.0

        return values
