"""Authentication API endpoints.

POST /auth/register — create a new account
POST /auth/login    — obtain a JWT token
GET  /auth/me       — return the current user's profile
"""

from __future__ import annotations

import logging

from fastapi import APIRouter
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.api.dependencies import CurrentUserId, DbSession
from app.core.config import get_settings
from app.core.exceptions import (
    ConflictError,
    InvalidCredentialsError,
    NotFoundError,
)
from app.core.security import create_access_token, hash_password, verify_password
from app.models.user import User
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse, UserResponse

router = APIRouter(prefix="/auth", tags=["auth"])
logger = logging.getLogger(__name__)


@router.post(
    "/register",
    response_model=TokenResponse,
    status_code=201,
    summary="Register a new user account",
)
async def register(body: RegisterRequest, db: DbSession) -> TokenResponse:
    """Create a new user and return an access token."""
    new_user = User(
        email=body.email.lower(),
        password_hash=hash_password(body.password),
    )
    db.add(new_user)
    try:
        await db.flush()
    except IntegrityError as exc:
        await db.rollback()
        raise ConflictError(
            message="An account with this email address already exists.",
            error_code="email_already_registered",
        ) from exc

    settings = get_settings()
    token = create_access_token(str(new_user.id))
    logger.info("New user registered: %s", new_user.id)

    return TokenResponse(
        access_token=token,
        expires_in=settings.access_token_expire_minutes * 60,
    )


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Log in and obtain an access token",
)
async def login(body: LoginRequest, db: DbSession) -> TokenResponse:
    """Authenticate and return a JWT access token."""
    result = await db.execute(select(User).where(User.email == body.email.lower()))
    user = result.scalar_one_or_none()

    if user is None or not verify_password(body.password, user.password_hash):
        raise InvalidCredentialsError()

    settings = get_settings()
    token = create_access_token(str(user.id))
    logger.info("User logged in: %s", user.id)

    return TokenResponse(
        access_token=token,
        expires_in=settings.access_token_expire_minutes * 60,
    )


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get current user profile",
)
async def get_me(current_user_id: CurrentUserId, db: DbSession) -> UserResponse:
    """Return the authenticated user's profile."""
    result = await db.execute(select(User).where(User.id == current_user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise NotFoundError()
    return UserResponse.model_validate(user)
