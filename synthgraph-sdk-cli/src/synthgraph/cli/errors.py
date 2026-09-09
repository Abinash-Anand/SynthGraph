"""Turning SDK exceptions into CLI messages and exit codes (spec 53, 54).

Messages are short and actionable. Stack traces, backend internals and
credentials never reach the terminal.
"""

from __future__ import annotations

from collections.abc import Callable
from enum import IntEnum

from ..errors import (
    SynthGraphAuthenticationError,
    SynthGraphAuthorizationError,
    SynthGraphConfigurationError,
    SynthGraphConflictError,
    SynthGraphError,
    SynthGraphHTTPError,
    SynthGraphNotFoundError,
    SynthGraphRateLimitError,
    SynthGraphServerError,
    SynthGraphTransportError,
    SynthGraphValidationError,
)

__all__ = ["ExitCode", "describe_error"]


class ExitCode(IntEnum):
    """Exit codes scripts can branch on."""

    SUCCESS = 0
    FAILURE = 1
    USAGE = 2
    AUTHENTICATION = 3
    AUTHORIZATION = 4
    NOT_FOUND = 5
    VALIDATION = 6
    TRANSPORT = 7


def _transport_message(error: BaseException) -> str:
    assert isinstance(error, SynthGraphTransportError)
    if error.outcome_unknown:
        return f"{error.message} The request may or may not have been applied."
    return error.message


def _server_message(error: BaseException) -> str:
    assert isinstance(error, SynthGraphHTTPError)
    return f"The SynthGraph backend failed (HTTP {error.status_code})."


def _backend_message(error: BaseException) -> str:
    assert isinstance(error, SynthGraphHTTPError | SynthGraphValidationError)
    return error.message


#: Checked in order, most specific first. Each entry is
#: (exception type, message or message builder, exit code).
_Message = str | Callable[[BaseException], str]

_HANDLERS: tuple[tuple[type[BaseException], _Message, ExitCode], ...] = (
    (
        SynthGraphAuthenticationError,
        "Authentication failed. Check your SynthGraph API key (SYNTHGRAPH_API_KEY).",
        ExitCode.AUTHENTICATION,
    ),
    (
        SynthGraphAuthorizationError,
        "You do not have access to that resource.",
        ExitCode.AUTHORIZATION,
    ),
    (
        SynthGraphNotFoundError,
        "Not found. Check the ID, or confirm it belongs to your account.",
        ExitCode.NOT_FOUND,
    ),
    (SynthGraphConflictError, _backend_message, ExitCode.VALIDATION),
    (SynthGraphValidationError, _backend_message, ExitCode.VALIDATION),
    (
        SynthGraphRateLimitError,
        "The SynthGraph backend is rate limiting this API key. Try again shortly.",
        ExitCode.TRANSPORT,
    ),
    (SynthGraphServerError, _server_message, ExitCode.TRANSPORT),
    (SynthGraphTransportError, _transport_message, ExitCode.TRANSPORT),
    (SynthGraphConfigurationError, str, ExitCode.USAGE),
    (SynthGraphHTTPError, _backend_message, ExitCode.FAILURE),
    (SynthGraphError, str, ExitCode.FAILURE),
    # A failed export lands here: a bad --output path, a read-only volume.
    (OSError, str, ExitCode.FAILURE),
)


def describe_error(error: BaseException) -> tuple[str, ExitCode]:
    """Map an exception to the message to print and the code to exit with."""
    for error_type, message, code in _HANDLERS:
        if isinstance(error, error_type):
            return (message(error) if callable(message) else message, code)

    return (str(error) or error.__class__.__name__, ExitCode.FAILURE)
