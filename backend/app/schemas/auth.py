"""Auth Pydantic schemas."""

from __future__ import annotations

from pydantic import BaseModel, EmailStr, Field


class RegisterRequest(BaseModel):
    """Request body for POST /auth/register."""

    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)


class LoginRequest(BaseModel):
    """Request body for POST /auth/login."""

    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    """Response for login and register."""

    access_token: str
    token_type: str = "bearer"  # noqa: S105
    expires_in: int  # seconds


class UserResponse(BaseModel):
    """Authenticated user profile (GET /auth/me)."""

    id: str
    email: str

    model_config = {"from_attributes": True}
