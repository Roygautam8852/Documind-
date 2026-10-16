"""API v1 router — assembles all endpoint routers."""

from __future__ import annotations

from fastapi import APIRouter

from app.api.v1 import auth, chat, conversations, documents, health, summaries

api_router = APIRouter()

# Health endpoints at the API root level (no /v1 prefix)
api_router.include_router(health.router)

# Versioned endpoints
api_router.include_router(auth.router)
api_router.include_router(documents.router)
api_router.include_router(chat.router)
api_router.include_router(conversations.router)
api_router.include_router(summaries.router)
