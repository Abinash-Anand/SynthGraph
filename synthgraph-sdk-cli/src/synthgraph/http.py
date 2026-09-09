"""Low-level HTTP transport (spec 15).

Everything HTTP lives here: methods, headers, authentication, timeouts, JSON
encoding/decoding, response-shape validation, error translation and retries.
Resource modules never touch httpx directly, and the CLI never opens its own
transport (spec 43).
"""

from __future__ import annotations

import time
from types import TracebackType
from typing import Any, Self

import httpx

from ._version import __version__
from .config import SynthGraphConfig
from .errors import (
    SynthGraphAuthenticationError,
    SynthGraphAuthorizationError,
    SynthGraphConflictError,
    SynthGraphError,
    SynthGraphHTTPError,
    SynthGraphNotFoundError,
    SynthGraphRateLimitError,
    SynthGraphServerError,
    SynthGraphTransportError,
    SynthGraphValidationError,
    error_for_status,
    extract_error_message,
)
from .serialization import unwrap_list, unwrap_object

__all__ = [
    "SynthGraphAuthenticationError",
    "SynthGraphAuthorizationError",
    "SynthGraphConflictError",
    "SynthGraphHTTPClient",
    "SynthGraphHTTPError",
    "SynthGraphNotFoundError",
    "SynthGraphRateLimitError",
    "SynthGraphServerError",
    "SynthGraphTransportError",
    "SynthGraphValidationError",
]

USER_AGENT = "synthgraph-python"

#: Methods the SDK may retry on its own. A retried POST/PATCH could duplicate
#: provenance because the backend exposes no idempotency key yet (spec 33).
SAFE_METHODS = frozenset({"GET", "HEAD", "OPTIONS"})


class SynthGraphHTTPClient:
    """Low-level HTTP client for the SynthGraph API."""

    def __init__(
        self,
        config: SynthGraphConfig,
        *,
        transport: httpx.BaseTransport | None = None,
        sleep: Any = time.sleep,
    ) -> None:
        self.config = config
        self._sleep = sleep

        headers = {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "User-Agent": f"{USER_AGENT}/{__version__}",
        }

        if config.api_key is not None:
            headers["Authorization"] = f"Bearer {config.api_key}"

        self._client = httpx.Client(
            base_url=config.api_url.rstrip("/"),
            headers=headers,
            timeout=config.timeout,
            transport=transport,
        )

    # -- public request helpers -------------------------------------------

    def get(
        self,
        path: str,
        *,
        params: dict[str, Any] | None = None,
        operation: str | None = None,
    ) -> dict[str, Any]:
        """Send a GET request expecting a JSON object response."""
        response = self._request("GET", path, params=params, operation=operation)
        return self._handle_response(response, operation=operation, path=path)

    def get_list(
        self,
        path: str,
        *,
        params: dict[str, Any] | None = None,
        operation: str | None = None,
    ) -> list[dict[str, Any]]:
        """Send a GET request expecting a JSON array response."""
        response = self._request("GET", path, params=params, operation=operation)
        return self._handle_list_response(response, operation=operation, path=path)

    def get_text(
        self,
        path: str,
        *,
        params: dict[str, Any] | None = None,
        accept: str = "text/markdown, text/plain, application/json",
        operation: str | None = None,
    ) -> str:
        """Send a GET request expecting text (Markdown documentation, spec 28)."""
        response = self._request(
            "GET",
            path,
            params=params,
            operation=operation,
            headers={"Accept": accept},
        )
        self._raise_for_status(response, operation=operation, path=path)
        return self._decode_text(response)

    def post(
        self,
        path: str,
        *,
        json: dict[str, Any] | None = None,
        operation: str | None = None,
    ) -> dict[str, Any]:
        """Send a POST request, optionally with a JSON body."""
        response = self._request("POST", path, json=json, operation=operation)
        return self._handle_response(response, operation=operation, path=path)

    def post_list(
        self,
        path: str,
        *,
        json: dict[str, Any] | None = None,
        operation: str | None = None,
    ) -> list[dict[str, Any]]:
        """Send a POST request expecting a JSON array response."""
        response = self._request("POST", path, json=json, operation=operation)
        return self._handle_list_response(response, operation=operation, path=path)

    def patch(
        self,
        path: str,
        *,
        json: dict[str, Any] | None = None,
        operation: str | None = None,
    ) -> dict[str, Any]:
        """Send a PATCH request, optionally with a JSON body."""
        response = self._request("PATCH", path, json=json, operation=operation)
        return self._handle_response(response, operation=operation, path=path)

    def close(self) -> None:
        """Close the underlying HTTP client."""
        self._client.close()

    def __enter__(self) -> Self:
        return self

    def __exit__(
        self,
        exc_type: type[BaseException] | None,
        exc_value: BaseException | None,
        traceback: TracebackType | None,
    ) -> None:
        self.close()

    # -- request execution -------------------------------------------------

    def _request(
        self,
        method: str,
        path: str,
        *,
        params: dict[str, Any] | None = None,
        json: dict[str, Any] | None = None,
        headers: dict[str, str] | None = None,
        operation: str | None = None,
    ) -> httpx.Response:
        """Execute a request, retrying only when that is provably safe."""
        retryable = method.upper() in SAFE_METHODS
        policy = self.config.retry
        attempts = policy.max_attempts if retryable else 1
        last_error: SynthGraphError | None = None

        request_params = {key: value for key, value in (params or {}).items() if value is not None}

        for attempt in range(1, attempts + 1):
            try:
                response = self._client.request(
                    method,
                    path,
                    params=request_params or None,
                    json=json,
                    headers=headers,
                )
            except httpx.TimeoutException:
                last_error = SynthGraphTransportError(
                    f"Request timed out after {self.config.timeout}s",
                    operation=operation,
                    path=path,
                    outcome_unknown=not retryable,
                )
            except httpx.TransportError as exc:
                last_error = SynthGraphTransportError(
                    f"Could not reach the SynthGraph backend at {self.config.api_url} "
                    f"({type(exc).__name__})",
                    operation=operation,
                    path=path,
                    outcome_unknown=not retryable,
                )
            else:
                if (
                    retryable
                    and attempt < attempts
                    and response.status_code in policy.retry_statuses
                ):
                    self._sleep(policy.backoff_seconds(attempt))
                    continue
                return response

            if attempt < attempts:
                self._sleep(policy.backoff_seconds(attempt))

        assert last_error is not None  # only reachable after a transport failure
        raise last_error

    # -- response handling -------------------------------------------------

    def _handle_response(
        self,
        response: httpx.Response,
        *,
        operation: str | None = None,
        path: str | None = None,
    ) -> dict[str, Any]:
        """Validate and decode an API object response."""
        self._raise_for_status(response, operation=operation, path=path)

        if not response.content:
            return {}

        return unwrap_object(
            self._decode_json(response, operation=operation, path=path),
            operation=operation,
            path=path or str(response.request.url.path),
        )

    def _handle_list_response(
        self,
        response: httpx.Response,
        *,
        operation: str | None = None,
        path: str | None = None,
    ) -> list[dict[str, Any]]:
        """Validate and decode an API list response."""
        self._raise_for_status(response, operation=operation, path=path)

        if not response.content:
            return []

        return unwrap_list(
            self._decode_json(response, operation=operation, path=path),
            operation=operation,
            path=path or str(response.request.url.path),
        )

    def _raise_for_status(
        self,
        response: httpx.Response,
        *,
        operation: str | None = None,
        path: str | None = None,
    ) -> None:
        """Translate an error response into the SDK error taxonomy."""
        if not response.is_error:
            return

        try:
            payload: Any = response.json()
        except ValueError:
            payload = None

        message = extract_error_message(
            payload,
            fallback=f"Request failed with HTTP {response.status_code}",
        )

        raise error_for_status(
            response.status_code,
            message=message,
            operation=operation,
            path=path,
            details=payload if isinstance(payload, dict) else None,
        )

    @staticmethod
    def _decode_json(
        response: httpx.Response,
        *,
        operation: str | None = None,
        path: str | None = None,
    ) -> Any:
        try:
            return response.json()
        except ValueError:
            raise SynthGraphTransportError(
                "The SynthGraph backend returned a response that is not valid JSON",
                operation=operation,
                path=path,
            ) from None

    @staticmethod
    def _decode_text(response: httpx.Response) -> str:
        """Return the body as text, unwrapping a JSON-wrapped document.

        The documentation route returns Markdown; whether it arrives as
        ``text/markdown`` or wrapped in a JSON field is an open contract item,
        so both are accepted (spec 28, CONTRACT.md).
        """
        content_type = response.headers.get("content-type", "")
        if "json" in content_type:
            try:
                payload = response.json()
            except ValueError:
                return response.text
            if isinstance(payload, str):
                return payload
            if isinstance(payload, dict):
                for key in ("documentation", "markdown", "content", "data"):
                    value = payload.get(key)
                    if isinstance(value, str):
                        return value
        return response.text
