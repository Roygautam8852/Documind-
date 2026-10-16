"""Unit tests for health and readiness endpoints."""

from __future__ import annotations

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_health_returns_200(client: AsyncClient) -> None:
    """GET /api/v1/health should return 200 with status ok."""
    response = await client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "version" in data
    assert "app_name" in data


@pytest.mark.asyncio
async def test_health_contains_version(client: AsyncClient) -> None:
    """Health response should include a version string."""
    response = await client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data["version"], str)
    assert len(data["version"]) > 0


@pytest.mark.asyncio
async def test_request_id_header_present(client: AsyncClient) -> None:
    """Every response should include an X-Request-ID header."""
    response = await client.get("/api/v1/health")
    assert "x-request-id" in {k.lower() for k in response.headers}


@pytest.mark.asyncio
async def test_request_id_is_consistent(client: AsyncClient) -> None:
    """If the client sends X-Request-ID, the server should echo it back."""
    custom_id = "test-request-12345"
    response = await client.get("/api/v1/health", headers={"X-Request-ID": custom_id})
    assert response.headers.get("x-request-id") == custom_id


@pytest.mark.asyncio
async def test_unknown_route_returns_404(client: AsyncClient) -> None:
    """Requests to unknown routes should return 404."""
    response = await client.get("/api/v1/nonexistent-endpoint")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_cors_headers_present(client: AsyncClient) -> None:
    """CORS preflight from the allowed origin should succeed."""
    response = await client.options(
        "/api/v1/health",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "GET",
        },
    )
    # CORS middleware returns 200 for preflight
    assert response.status_code in (200, 204)
