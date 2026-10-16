"""Application configuration using Pydantic Settings.

All settings are loaded from environment variables. See docs/ENVIRONMENT_VARIABLES.md
for the full reference. Settings are validated at startup — the application will
refuse to start if required variables are missing or invalid.
"""

from __future__ import annotations

from functools import lru_cache
from typing import Literal

from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application-wide configuration loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── Application ──────────────────────────────────────────────────────────
    app_env: Literal["development", "test", "production"] = "development"
    app_name: str = "DocuMind"
    api_host: str = "0.0.0.0"  # noqa: S104
    api_port: int = 8000
    frontend_origin: str = "http://localhost:5173"

    # ── Database ─────────────────────────────────────────────────────────────
    database_url: str = Field(..., description="PostgreSQL async connection string")

    # ── File Storage ─────────────────────────────────────────────────────────
    storage_backend: Literal["local"] = "local"
    upload_dir: str = "./data/uploads"
    max_upload_mb: int = Field(default=50, ge=1, le=500)
    allowed_extensions: str = "pdf,docx,txt"

    # ── Vector Store ─────────────────────────────────────────────────────────
    vector_store: Literal["chroma", "mock"] = "chroma"
    chroma_persist_dir: str = "./data/chroma"

    # ── Embeddings ───────────────────────────────────────────────────────────
    embedding_provider: Literal["sentence_transformers", "mock"] = "sentence_transformers"
    embedding_model: str = "all-MiniLM-L6-v2"

    # ── LLM Provider ─────────────────────────────────────────────────────────
    llm_provider: Literal["openai", "anthropic", "google", "mock"] = "mock"
    llm_model: str = "gpt-4o-mini"
    llm_api_key: str = ""
    llm_base_url: str = ""

    # ── RAG Parameters ───────────────────────────────────────────────────────
    chunk_size: int = Field(default=800, ge=100, le=8000)
    chunk_overlap: int = Field(default=120, ge=0, le=1000)
    top_k: int = Field(default=5, ge=1, le=50)
    similarity_threshold: float = Field(default=0.35, ge=0.0, le=1.0)

    # ── Authentication ───────────────────────────────────────────────────────
    auth_mode: Literal["jwt"] = "jwt"
    jwt_secret: str = Field(..., min_length=16, description="JWT signing secret")
    access_token_expire_minutes: int = Field(default=60, ge=5, le=10080)

    # ── Logging ───────────────────────────────────────────────────────────────
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"] = "INFO"

    # ── Computed properties ───────────────────────────────────────────────────
    @property
    def allowed_extensions_set(self) -> set[str]:
        """Return the allowed extensions as a lowercase set."""
        return {ext.strip().lower() for ext in self.allowed_extensions.split(",")}

    @property
    def max_upload_bytes(self) -> int:
        """Return max upload size in bytes."""
        return self.max_upload_mb * 1024 * 1024

    @property
    def is_production(self) -> bool:
        return self.app_env == "production"

    @property
    def is_test(self) -> bool:
        return self.app_env == "test"

    # ── Validators ────────────────────────────────────────────────────────────
    @field_validator("jwt_secret")
    @classmethod
    def validate_jwt_secret(cls, v: str) -> str:
        if v in (
            "CHANGE_ME_to_a_long_random_secret_string",
            "dev-only-secret-change-in-production",
        ):
            import warnings

            warnings.warn(
                "JWT_SECRET is set to a default development value. "
                "This MUST be changed before production deployment.",
                stacklevel=2,
            )
        return v

    @model_validator(mode="after")
    def validate_production_settings(self) -> Settings:
        if self.is_production:
            if self.llm_provider != "mock" and not self.llm_api_key:
                raise ValueError(
                    f"LLM_API_KEY is required when LLM_PROVIDER={self.llm_provider} in production"
                )
        return self


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return the cached application settings singleton.

    The settings are loaded once and cached. In tests, clear the cache
    with ``get_settings.cache_clear()`` to reload from a modified environment.
    """
    return Settings()  # type: ignore[call-arg]
