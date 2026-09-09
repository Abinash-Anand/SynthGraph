"""SynthGraph SDK error taxonomy (spec 16).

``SynthGraphHTTPError`` predates this module and stays the base class for every
HTTP-derived error, so existing code that catches it keeps working while new
code can catch the specific category it cares about.

Credentials never enter an exception. Errors are built from the status code,
the backend's own safe message, the logical operation and the request path.
Request headers are never attached to an error.
"""

from __future__ import annotations

from typing import Any

__all__ = [
    "SynthGraphAuthenticationError",
    "SynthGraphAuthorizationError",
    "SynthGraphConfigurationError",
    "SynthGraphConflictError",
    "SynthGraphError",
    "SynthGraphHTTPError",
    "SynthGraphNotFoundError",
    "SynthGraphRateLimitError",
    "SynthGraphServerError",
    "SynthGraphTransportError",
    "SynthGraphValidationError",
    "error_for_status",
    "extract_error_message",
]


class SynthGraphError(Exception):
    """Base class for every error raised by the SDK."""


class SynthGraphConfigurationError(SynthGraphError):
    """The SDK was not given usable configuration."""


class SynthGraphValidationError(SynthGraphError):
    """Input rejected client-side, or a 400/422 from the backend.

    Client-side validation is developer experience only. It is not a security
    boundary and does not replace backend validation (spec 17, 7.6).
    """

    def __init__(
        self,
        message: str,
        *,
        field: str | None = None,
        status_code: int | None = None,
        operation: str | None = None,
        path: str | None = None,
        details: Any = None,
    ) -> None:
        super().__init__(message)
        self.message = message
        self.field = field
        self.status_code = status_code
        self.operation = operation
        self.path = path
        self.details = details


class SynthGraphHTTPError(SynthGraphError):
    """Raised when a SynthGraph API request fails.

    Base class of the HTTP error categories below.
    """

    def __init__(
        self,
        status_code: int,
        message: str,
        *,
        operation: str | None = None,
        path: str | None = None,
        details: Any = None,
    ) -> None:
        self.status_code = status_code
        self.message = message
        self.operation = operation
        self.path = path
        self.details = details

        super().__init__(
            f"SynthGraph API request failed with status {status_code}: {message}"
        )


class SynthGraphAuthenticationError(SynthGraphHTTPError):
    """401 - the API key is missing, malformed or rejected."""


class SynthGraphAuthorizationError(SynthGraphHTTPError):
    """403 - authenticated, but not permitted to access this resource."""


class SynthGraphNotFoundError(SynthGraphHTTPError):
    """404 - no such resource, or it is not visible to this user.

    Knowing an ID does not imply access to it (spec 65), so a 404 may also mean
    the resource belongs to someone else.
    """


class SynthGraphConflictError(SynthGraphHTTPError):
    """409 - the request conflicts with current backend state."""


class SynthGraphRateLimitError(SynthGraphHTTPError):
    """429 - too many requests."""


class SynthGraphServerError(SynthGraphHTTPError):
    """5xx - the backend failed to handle the request."""


class SynthGraphTransportError(SynthGraphError):
    """The request never produced a usable HTTP response.

    Connection failures, timeouts, and responses whose shape the SDK cannot
    trust. When ``outcome_unknown`` is true the request may still have been
    applied by the backend, so the SDK must not report success and must not
    silently retry a write (spec 7.5, 33).
    """

    def __init__(
        self,
        message: str,
        *,
        operation: str | None = None,
        path: str | None = None,
        outcome_unknown: bool = False,
    ) -> None:
        super().__init__(message)
        self.message = message
        self.operation = operation
        self.path = path
        self.outcome_unknown = outcome_unknown


_STATUS_MAP: dict[int, type[SynthGraphHTTPError]] = {
    401: SynthGraphAuthenticationError,
    403: SynthGraphAuthorizationError,
    404: SynthGraphNotFoundError,
    409: SynthGraphConflictError,
    429: SynthGraphRateLimitError,
}

_VALIDATION_STATUSES = frozenset({400, 422})


def error_for_status(
    status_code: int,
    *,
    message: str,
    operation: str | None = None,
    path: str | None = None,
    details: Any = None,
) -> SynthGraphError:
    """Translate an HTTP status into the SDK error taxonomy.

    The mapping is deterministic (spec 16)::

        400/422 -> SynthGraphValidationError
        401     -> SynthGraphAuthenticationError
        403     -> SynthGraphAuthorizationError
        404     -> SynthGraphNotFoundError
        409     -> SynthGraphConflictError
        429     -> SynthGraphRateLimitError
        5xx     -> SynthGraphServerError
        other   -> SynthGraphHTTPError
    """
    if status_code in _VALIDATION_STATUSES:
        return SynthGraphValidationError(
            message,
            status_code=status_code,
            operation=operation,
            path=path,
            details=details,
        )

    error_class = _STATUS_MAP.get(status_code)
    if error_class is None:
        error_class = SynthGraphServerError if status_code >= 500 else SynthGraphHTTPError

    return error_class(
        status_code,
        message,
        operation=operation,
        path=path,
        details=details,
    )


def extract_error_message(payload: Any, fallback: str) -> str:
    """Pull a safe, human-usable message out of a backend error body.

    NestJS typically returns ``{"statusCode":.., "message":.., "error":..}``
    where ``message`` is a string or a list of validation strings. Anything that
    is not a string is not echoed verbatim, so backend internals cannot leak
    through the SDK (spec 16, 54).
    """
    if isinstance(payload, dict):
        for key in ("detail", "message", "error"):
            value = payload.get(key)
            if isinstance(value, str) and value.strip():
                return value.strip()
            if isinstance(value, (list, tuple)):
                items = [item.strip() for item in value if isinstance(item, str) and item.strip()]
                if items:
                    return "; ".join(items)
    return fallback
