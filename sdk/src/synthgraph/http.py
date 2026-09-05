from types import TracebackType
from typing import Any, Self

import httpx

from .config import SynthGraphConfig


class SynthGraphHTTPError(Exception):
    """Raised when the SynthGraph API returns an error response."""

    def __init__(self, status_code: int, message: str) -> None:
        self.status_code = status_code
        self.message = message

        super().__init__(
            f"SynthGraph API request failed with status "
            f"{status_code}: {message}"
        )


class SynthGraphHTTPClient:
    """Low-level HTTP client for the SynthGraph API."""

    def __init__(
        self,
        config: SynthGraphConfig,
        transport: httpx.BaseTransport | None = None,
    ) -> None:
        self.config = config

        self._client = httpx.Client(
            base_url=config.api_url,
            timeout=config.timeout,
            headers=self._build_headers(),
            transport=transport,
        )

    def _build_headers(self) -> dict[str, str]:
        """Build default HTTP headers."""
        headers = {
            "Accept": "application/json",
            "Content-Type": "application/json",
        }

        if self.config.api_key is not None:
            headers["Authorization"] = f"Bearer {self.config.api_key}"

        return headers

    def get(
        self,
        path: str,
        *,
        params: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """Send a GET request."""
        response = self._client.get(path, params=params)

        return self._handle_response(response)

    def post(
        self,
        path: str,
        *,
        json: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """Send a POST request."""
        response = self._client.post(path, json=json)

        return self._handle_response(response)

    @staticmethod
    def _handle_response(response: httpx.Response) -> dict[str, Any]:
        """Validate and decode an API response."""
        if response.is_error:
            try:
                data = response.json()
                message = str(
                    data.get(
                        "detail",
                        data.get("message", response.text),
                    )
                )
            except ValueError:
                message = response.text

            raise SynthGraphHTTPError(
                status_code=response.status_code,
                message=message,
            )

        if not response.content:
            return {}

        data = response.json()

        if not isinstance(data, dict):
            raise SynthGraphHTTPError(
                status_code=response.status_code,
                message="API response must be a JSON object",
            )

        return data

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