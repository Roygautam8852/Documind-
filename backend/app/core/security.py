"""Security utilities: password hashing, JWT creation and verification.

Secrets (JWT_SECRET, LLM_API_KEY) are NEVER logged or included in responses.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import get_settings
from app.core.exceptions import TokenExpiredError, TokenInvalidError

_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# ── Password utilities ────────────────────────────────────────────────────────


def hash_password(plain_password: str) -> str:
    """Return a bcrypt hash of the plain-text password."""
    return _pwd_context.hash(plain_password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Return True if plain_password matches hashed_password."""
    return _pwd_context.verify(plain_password, hashed_password)


# ── JWT utilities ─────────────────────────────────────────────────────────────

_ALGORITHM = "HS256"


def create_access_token(
    subject: str,
    extra_claims: dict[str, Any] | None = None,
) -> str:
    """Create a signed JWT access token.

    Args:
        subject: The token subject (user ID as string).
        extra_claims: Additional claims to include in the payload.

    Returns:
        A signed JWT string.
    """
    settings = get_settings()
    now = datetime.now(tz=timezone.utc)
    expire = now + timedelta(minutes=settings.access_token_expire_minutes)

    payload: dict[str, Any] = {
        "sub": subject,
        "iat": now,
        "exp": expire,
        "type": "access",
    }
    if extra_claims:
        payload.update(extra_claims)

    return jwt.encode(payload, settings.jwt_secret, algorithm=_ALGORITHM)


def decode_access_token(token: str) -> dict[str, Any]:
    """Decode and validate a JWT access token.

    Returns:
        The decoded payload dictionary.

    Raises:
        TokenExpiredError: If the token has expired.
        TokenInvalidError: If the token is malformed or the signature is invalid.
    """
    settings = get_settings()
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[_ALGORITHM])
        if payload.get("type") != "access":
            raise TokenInvalidError()
        return payload
    except JWTError as exc:
        if "expired" in str(exc).lower():
            raise TokenExpiredError() from exc
        raise TokenInvalidError() from exc


def extract_user_id(token: str) -> str:
    """Extract the user ID (sub claim) from a token.

    Raises:
        TokenInvalidError: If the subject claim is missing.
    """
    payload = decode_access_token(token)
    sub = payload.get("sub")
    if not sub:
        raise TokenInvalidError("Token is missing subject claim.")
    return str(sub)
