"""Runtime configuration, loaded from environment / .env."""

from __future__ import annotations

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # OpenRouter (model-agnostic gateway). The service never hardcodes a provider.
    openrouter_api_key: str = ""
    openrouter_base_url: str = "https://openrouter.ai/api/v1"

    # Sensible per-agent defaults (overridable per request). Cheap model for the
    # mechanical extraction work; a stronger model for personalized writing.
    default_resume_model: str = "openai/gpt-4o-mini"
    default_personalization_model: str = "anthropic/claude-3.5-sonnet"

    request_timeout_seconds: int = 120

    # OpenRouter attribution headers (optional but recommended).
    app_title: str = "Personalized Mass AI Mailer"
    app_referer: str = "http://localhost:3000"

    # CORS — comma-separated list of allowed web origins.
    cors_allow_origins: str = "http://localhost:3000"

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.cors_allow_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
