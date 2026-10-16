"""ChromaDB vector store adapter with multi-tenant filtering."""

from __future__ import annotations

import logging
from typing import Any

from app.core.config import get_settings
from app.providers.vector_store.base import BaseVectorStore, VectorSearchResult

logger = logging.getLogger(__name__)

_COLLECTION_NAME = "documind_chunks"


class ChromaVectorStore(BaseVectorStore):
    """ChromaDB adapter storing embeddings with filesystem persistence.

    Enforces strict owner_id filtering on all vector queries to prevent cross-tenant data leakage.
    """

    def __init__(
        self,
        persist_dir: str | None = None,
        client: Any = None,  # noqa: ANN401
        persist_directory: str | None = None,
    ) -> None:
        target_dir = persist_dir or persist_directory or get_settings().chroma_persist_dir
        self._persist_dir = target_dir
        self._client: Any = client
        self._collection: Any = None

    def _get_collection(self) -> Any:  # noqa: ANN401
        if self._collection is None:
            if self._client is None:
                try:
                    import chromadb
                except ImportError as exc:
                    raise RuntimeError(
                        "chromadb is not installed. Run: pip install chromadb"
                    ) from exc
                self._client = chromadb.PersistentClient(path=self._persist_dir)

            self._collection = self._client.get_or_create_collection(
                name=_COLLECTION_NAME,
                metadata={"hnsw:space": "cosine"},
            )
        return self._collection

    async def add_chunks(
        self,
        document_id: str,
        owner_id: str,
        chunk_ids: list[str],
        texts: list[str],
        embeddings: list[list[float]],
        metadatas: list[dict[str, Any]],
    ) -> list[str]:
        if not chunk_ids:
            return []

        collection = self._get_collection()

        # 1. Guarantee idempotency: purge any existing vectors for this document
        await self.delete_document_vectors(document_id, owner_id)

        # 2. Prepare flat metadata accepted by Chroma (str, int, float, bool)
        chroma_metas: list[dict[str, str | int | float | bool]] = []
        for i, meta in enumerate(metadatas):
            clean_meta: dict[str, str | int | float | bool] = {
                "document_id": document_id,
                "owner_id": owner_id,
                "chunk_index": int(meta.get("chunk_index", i)),
            }
            if meta.get("page_number") is not None:
                clean_meta["page_number"] = int(meta["page_number"])
            if meta.get("token_count") is not None:
                clean_meta["token_count"] = int(meta["token_count"])
            chroma_metas.append(clean_meta)

        # 3. Add to Chroma collection
        collection.upsert(
            ids=chunk_ids,
            embeddings=embeddings,
            documents=texts,
            metadatas=chroma_metas,
        )
        logger.info(
            "Indexed %d chunks in Chroma for document_id=%s owner_id=%s",
            len(chunk_ids),
            document_id,
            owner_id,
        )
        return [f"chroma_{cid}" for cid in chunk_ids]

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
        collection = self._get_collection()

        # Construct strict owner filter
        if document_ids:
            if len(document_ids) == 1:
                where_filter: dict[str, Any] = {
                    "$and": [
                        {"owner_id": owner_id},
                        {"document_id": document_ids[0]},
                    ]
                }
            else:
                where_filter = {
                    "$and": [
                        {"owner_id": owner_id},
                        {"document_id": {"$in": document_ids}},
                    ]
                }
        else:
            where_filter = {"owner_id": owner_id}

        count = collection.count()
        if count == 0:
            return []

        n_results = min(top_k, count)
        results = collection.query(
            query_embeddings=[target_vector],
            n_results=n_results,
            where=where_filter,
            include=["documents", "metadatas", "distances"],
        )

        matches: list[VectorSearchResult] = []
        ids = results.get("ids", [[]])[0]
        docs = results.get("documents", [[]])[0]
        metas = results.get("metadatas", [[]])[0]
        distances = results.get("distances", [[]])[0]

        for chunk_id, text, meta, dist in zip(ids, docs, metas, distances, strict=True):
            # Chroma returns cosine distance in [0, 2].
            # Convert to similarity score in [0.0, 1.0]: 1.0 - (dist / 2.0)
            score = max(0.0, min(1.0, 1.0 - (float(dist) / 2.0)))

            if score >= score_threshold:
                matches.append(
                    VectorSearchResult(
                        chunk_id=chunk_id,
                        document_id=str(meta.get("document_id", "")),
                        owner_id=str(meta.get("owner_id", "")),
                        text=text or "",
                        score=score,
                        page_number=meta.get("page_number"),
                        chunk_index=int(meta.get("chunk_index", 0)),
                        metadata=dict(meta),
                    )
                )

        matches.sort(key=lambda m: m.score, reverse=True)
        return matches

    async def delete_document_vectors(self, document_id: str, owner_id: str) -> None:
        collection = self._get_collection()
        try:
            collection.delete(
                where={
                    "$and": [
                        {"document_id": document_id},
                        {"owner_id": owner_id},
                    ]
                }
            )
            logger.info("Deleted vectors for document_id=%s from Chroma", document_id)
        except Exception as exc:
            # If collection is empty or document didn't exist in Chroma, it's non-fatal
            logger.debug("Chroma delete notice for document_id=%s: %s", document_id, exc)

    async def count(self, owner_id: str | None = None) -> int:
        collection = self._get_collection()
        if owner_id is None:
            return int(collection.count())
        res = collection.get(where={"owner_id": owner_id})
        return len(res.get("ids", []))
