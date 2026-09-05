from types import TracebackType
from typing import Any, Self

import httpx

from .config import SynthGraphConfig


class SynthGraphHTTPError(Exception):
    """Raised when a SynthGraph API request fails."""

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
        *,
        transport: httpx.BaseTransport | None = None,
    ) -> None:
        self.config = config

        headers = {
            "Accept": "application/json",
            "Content-Type": "application/json",
        }

        if config.api_key is not None:
            headers["Authorization"] = f"Bearer {config.api_key}"

        self._client = httpx.Client(
            base_url=config.api_url.rstrip("/"),
            headers=headers,
            timeout=config.timeout,
            transport=transport,
        )

    def get(self, path: str) -> dict[str, Any]:
        """Send a GET request expecting a JSON object response."""
        response = self._client.get(path)

        return self._handle_response(response)

    def get_list(self, path: str) -> list[dict[str, Any]]:
        """Send a GET request expecting a JSON array response."""
        response = self._client.get(path)

        return self._handle_list_response(response)

    def post(
        self,
        path: str,
        *,
        json: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """Send a POST request, optionally with a JSON body."""
        if json is None:
            response = self._client.post(path)
        else:
            response = self._client.post(path, json=json)

        return self._handle_response(response)

    def patch(
        self,
        path: str,
        *,
        json: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """Send a PATCH request, optionally with a JSON body."""
        if json is None:
            response = self._client.patch(path)
        else:
            response = self._client.patch(path, json=json)

        return self._handle_response(response)
    
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

    @staticmethod
    def _handle_response(
        response: httpx.Response,
    ) -> dict[str, Any]:
        """Validate and decode an API object response."""
        if response.is_error:
            raise SynthGraphHTTPClient._create_http_error(response)

        if not response.content:
            return {}

        data = response.json()

        if not isinstance(data, dict):
            raise SynthGraphHTTPError(
                status_code=response.status_code,
                message="API response must be a JSON object",
            )

        return data

    @staticmethod
    def _handle_list_response(
        response: httpx.Response,
    ) -> list[dict[str, Any]]:
        """Validate and decode an API list response."""
        if response.is_error:
            raise SynthGraphHTTPClient._create_http_error(response)

        if not response.content:
            return []

        data = response.json()

        if not isinstance(data, list):
            raise SynthGraphHTTPError(
                status_code=response.status_code,
                message="API response must be a JSON array",
            )

        if not all(isinstance(item, dict) for item in data):
            raise SynthGraphHTTPError(
                status_code=response.status_code,
                message="API response array must contain JSON objects",
            )

        return data

    @staticmethod
    def _create_http_error(
        response: httpx.Response,
    ) -> SynthGraphHTTPError:
        """Create a consistent API error from an HTTP response."""
        try:
            data = response.json()

            if isinstance(data, dict):
                message = str(
                    data.get(
                        "detail",
                        data.get("message", response.text),
                    )
                )
            else:
                message = response.text
        except ValueError:
            message = response.text

        return SynthGraphHTTPError(
            status_code=response.status_code,
            message=message,
        )