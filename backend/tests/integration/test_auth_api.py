"""Integration tests for the auth API endpoints."""

from __future__ import annotations

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_register_creates_account(client: AsyncClient) -> None:
    """POST /auth/register should return 201 with an access token."""
    response = await client.post(
        "/api/v1/auth/register",
        json={"email": "test@example.com", "password": "securepassword123"},
    )
    assert response.status_code == 201
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["expires_in"] > 0


@pytest.mark.asyncio
async def test_register_duplicate_email_returns_409(client: AsyncClient) -> None:
    """Registering the same email twice should return 409 Conflict."""
    payload = {"email": "duplicate@example.com", "password": "securepassword123"}
    await client.post("/api/v1/auth/register", json=payload)
    response = await client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 409
    assert response.json()["error_code"] == "email_already_registered"


@pytest.mark.asyncio
async def test_login_valid_credentials(client: AsyncClient) -> None:
    """POST /auth/login with valid credentials should return a token."""
    await client.post(
        "/api/v1/auth/register",
        json={"email": "logintest@example.com", "password": "mypassword123"},
    )
    response = await client.post(
        "/api/v1/auth/login",
        json={"email": "logintest@example.com", "password": "mypassword123"},
    )
    assert response.status_code == 200
    assert "access_token" in response.json()


@pytest.mark.asyncio
async def test_login_wrong_password_returns_401(client: AsyncClient) -> None:
    """POST /auth/login with wrong password should return 401."""
    await client.post(
        "/api/v1/auth/register",
        json={"email": "wrongpass@example.com", "password": "correctpass123"},
    )
    response = await client.post(
        "/api/v1/auth/login",
        json={"email": "wrongpass@example.com", "password": "wrongpass"},
    )
    assert response.status_code == 401
    assert response.json()["error_code"] == "invalid_credentials"


@pytest.mark.asyncio
async def test_login_unknown_email_returns_401(client: AsyncClient) -> None:
    """POST /auth/login with unknown email should return 401."""
    response = await client.post(
        "/api/v1/auth/login",
        json={"email": "nobody@example.com", "password": "whatever123"},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_get_me_with_valid_token(client: AsyncClient) -> None:
    """GET /auth/me with valid token should return user profile."""
    reg = await client.post(
        "/api/v1/auth/register",
        json={"email": "me@example.com", "password": "password12345"},
    )
    token = reg.json()["access_token"]

    response = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "me@example.com"
    assert "id" in data


@pytest.mark.asyncio
async def test_get_me_without_token_returns_401(client: AsyncClient) -> None:
    """GET /auth/me without a token should return 401."""
    response = await client.get("/api/v1/auth/me")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_register_short_password_returns_422(client: AsyncClient) -> None:
    """Passwords shorter than 8 characters should be rejected."""
    response = await client.post(
        "/api/v1/auth/register",
        json={"email": "short@example.com", "password": "short"},
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_error_response_never_exposes_internals(client: AsyncClient) -> None:
    """Error responses must not contain stack traces or file paths."""
    response = await client.post(
        "/api/v1/auth/login",
        json={"email": "nobody@example.com", "password": "x"},
    )
    text = response.text
    assert "Traceback" not in text
    assert "/app/" not in text
    assert "sqlalchemy" not in text.lower()
