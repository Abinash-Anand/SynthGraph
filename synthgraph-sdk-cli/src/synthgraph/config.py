"""SDK configuration (spec 13).

Resolution order:

1. explicit constructor arguments
2. environment variables
3. documented defaults

The API key is never rendered by ``repr()``, never serialized into a model or a
manifest, and never placed in an exception message (spec 14, 39).
"""

from __future__ import annotations

import os
from collections.abc import Mapping

from pydantic import BaseModel, ConfigDict, Field, field_validator

from .errors import SynthGraphConfigurationError

__all__ = [
    "DEFAULT_API_URL",
    "ENV_API_KEY",
    "ENV_API_URL",
    "ENV_MAX_ATTEMPTS",
    "ENV_PROJECT_ID",
    "ENV_TIMEOUT",
    "RetryPolicy",
    "SynthGraphConfig",
]

ENV_API_KEY = "SYNTHGRAPH_API_KEY"
ENV_API_URL = "SYNTHGRAPH_API_URL"
ENV_BASE_URL = "SYNTHGRAPH_BASE_URL"
ENV_TIMEOUT = "SYNTHGRAPH_TIMEOUT"
ENV_PROJECT_ID = "SYNTHGRAPH_PROJECT_ID"
ENV_MAX_ATTEMPTS = "SYNTHGRAPH_MAX_ATTEMPTS"

DEFAULT_API_URL = "https://synthgraph.onrender.com"
DEFAULT_TIMEOUT = 30.0


class RetryPolicy(BaseModel):
    """When the SDK is allowed to retry a request.

    Only requests the SDK knows to be safe are retried. Writes are never
    retried automatically: the backend has no idempotency-key contract yet, and
    a blind retry of a POST could duplicate provenance (spec 33).
    """

    model_config = ConfigDict(frozen=True)

    max_attempts: int = Field(default=3, ge=1, le=10)
    backoff_factor: float = Field(default=0.5, ge=0.0)
    max_backoff: float = Field(default=8.0, gt=0.0)
    retry_statuses: tuple[int, ...] = (408, 429, 500, 502, 503, 504)

    def backoff_seconds(self, attempt: int) -> float:
        """Exponential backoff before retrying, for a 1-based attempt number."""
        return min(self.backoff_factor * (2 ** max(attempt - 1, 0)), self.max_backoff)


class SynthGraphConfig(BaseModel):
    """Configuration for communicating with the SynthGraph backend."""

    model_config = ConfigDict(frozen=True)

    api_url: str = Field(
        default=DEFAULT_API_URL,
        min_length=1,
    )
    api_key: str | None = Field(default=None, repr=False)
    timeout: float = Field(
        default=DEFAULT_TIMEOUT,
        gt=0,
    )
    #: Optional default project for the fluent API. Not sent to the backend.
    project_id: str | None = None
    retry: RetryPolicy = Field(default_factory=RetryPolicy)

    @field_validator("api_url")
    @classmethod
    def normalize_api_url(cls, value: str) -> str:
        """Remove trailing slashes from the API URL."""
        normalized = value.strip().rstrip("/")
        if not normalized.startswith(("http://", "https://")):
            raise ValueError("api_url must start with http:// or https://")
        return normalized

    @field_validator("api_key")
    @classmethod
    def reject_blank_api_key(cls, value: str | None) -> str | None:
        """An all-whitespace key is a configuration mistake, not a credential."""
        if value is None:
            return None
        stripped = value.strip()
        if not stripped:
            raise ValueError("api_key must not be blank")
        return stripped

    @classmethod
    def from_env(
        cls,
        *,
        api_key: str | None = None,
        api_url: str | None = None,
        timeout: float | None = None,
        project_id: str | None = None,
        retry: RetryPolicy | None = None,
        env: Mapping[str, str] | None = None,
    ) -> SynthGraphConfig:
        """Build a config from explicit arguments, then environment, then defaults."""
        environ: Mapping[str, str] = os.environ if env is None else env

        resolved_url = api_url or environ.get(ENV_API_URL) or environ.get(ENV_BASE_URL)
        resolved_timeout = timeout
        if resolved_timeout is None and environ.get(ENV_TIMEOUT):
            try:
                resolved_timeout = float(environ[ENV_TIMEOUT])
            except ValueError:
                raise SynthGraphConfigurationError(
                    f"{ENV_TIMEOUT} must be a number"
                ) from None

        resolved_retry = retry
        if resolved_retry is None and environ.get(ENV_MAX_ATTEMPTS):
            try:
                resolved_retry = RetryPolicy(max_attempts=int(environ[ENV_MAX_ATTEMPTS]))
            except ValueError:
                raise SynthGraphConfigurationError(
                    f"{ENV_MAX_ATTEMPTS} must be an integer"
                ) from None

        values: dict[str, object] = {
            "api_key": api_key if api_key is not None else environ.get(ENV_API_KEY),
            "project_id": project_id or environ.get(ENV_PROJECT_ID),
        }
        if resolved_url:
            values["api_url"] = resolved_url
        if resolved_timeout is not None:
            values["timeout"] = resolved_timeout
        if resolved_retry is not None:
            values["retry"] = resolved_retry

        return cls(**values)  # type: ignore[arg-type]

    def require_api_key(self) -> str:
        """Return the API key, or explain how to supply one."""
        if not self.api_key:
            raise SynthGraphConfigurationError(
                "No SynthGraph API key configured. Pass api_key=... or set the "
                f"{ENV_API_KEY} environment variable."
            )
        return self.api_key

    @property
    def masked_api_key(self) -> str:
        """A display-safe fingerprint of the key. Never the key itself."""
        if not self.api_key:
            return "<not set>"
        if len(self.api_key) <= 4:
            return "****"
        return "****" + self.api_key[-4:]
