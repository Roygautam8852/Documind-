"""In-memory mock vector store adapter for fast tests and development."""

from __future__ import annotations

from typing import Any

from app.providers.vector_store.base import BaseVectorStore, VectorSearchResult


class MockVectorStore(BaseVectorStore):
    """In-memory vector store computing cosine similarity via dot product.

    Zero external dependencies; perfectly isolated for unit and integration tests.
    """

    def __init__(self) -> None:
        # Key: chunk_id -> dict of record data
        self._records: dict[str, dict[str, Any]] = {}

    async def add_chunks(
        self,
        document_id: str,
        owner_id: str,
        chunk_ids: list[str],
        texts: list[str],
        embeddings: list[list[float]],
        metadatas: list[dict[str, Any]],
    ) -> list[str]:
        # Idempotently overwrite any prior vectors for this document
        await self.delete_document_vectors(document_id, owner_id)

        vector_ids: list[str] = []
        for cid, text, emb, meta in zip(chunk_ids, texts, embeddings, metadatas, strict=True):
            vec_id = f"vec_{cid}"
            self._records[cid] = {
                "chunk_id": cid,
                "document_id": document_id,
                "owner_id": owner_id,
                "text": text,
                "embedding": emb,
                "metadata": meta,
                "vector_id": vec_id,
            }
            vector_ids.append(vec_id)
        return vector_ids

    async def query_similarity(
        self,
        query_vector: list[float] | None = None,
        owner_id: str = "",
        document_ids: list[str] | None = None,
        top_k: int = 5,
        score_threshold: float = 0.0,
        query_embedding: list[float] | None = None,
    ) -> list[VectorSearchResult]:
        target_vector = query_vector if query_vector is not None else query_embedding
        if target_vector is None:
            raise ValueError("query_vector or query_embedding is required")
        doc_id_set = set(document_ids) if document_ids is not None else None
        scored_results: list[VectorSearchResult] = []

        for record in self._records.values():
            # 1. Multi-tenant owner isolation
            if record["owner_id"] != owner_id:
                continue

            # 2. Document filter
            if doc_id_set is not None and record["document_id"] not in doc_id_set:
                continue

            # 3. Compute cosine similarity (dot product of unit vectors)
            emb = record["embedding"]
            similarity = sum(q * e for q, e in zip(target_vector, emb, strict=False))

            # Bound similarity to [0.0, 1.0]
            score = max(0.0, min(1.0, (similarity + 1.0) / 2.0 if similarity < 0 else similarity))

            if score >= score_threshold:
                meta = record["metadata"]
                scored_results.append(
                    VectorSearchResult(
                        chunk_id=record["chunk_id"],
                        document_id=record["document_id"],
                        owner_id=record["owner_id"],
                        text=record["text"],
                        score=score,
                        page_number=meta.get("page_number"),
                        chunk_index=meta.get("chunk_index", 0),
                        metadata=meta,
                    )
                )

        # Sort descending by similarity score
        scored_results.sort(key=lambda r: r.score, reverse=True)
        return scored_results[:top_k]

    async def delete_document_vectors(self, document_id: str, owner_id: str) -> None:
        to_delete = [
            cid
            for cid, r in self._records.items()
            if r["document_id"] == document_id and r["owner_id"] == owner_id
        ]
        for cid in to_delete:
            del self._records[cid]

    async def count(self, owner_id: str | None = None) -> int:
        if owner_id is None:
            return len(self._records)
        return sum(1 for r in self._records.values() if r["owner_id"] == owner_id)
