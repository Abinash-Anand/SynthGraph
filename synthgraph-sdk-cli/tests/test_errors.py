from __future__ import annotations

import pytest

from synthgraph.errors import (
    SynthGraphAuthenticationError,
    SynthGraphAuthorizationError,
    SynthGraphConflictError,
    SynthGraphError,
    SynthGraphHTTPError,
    SynthGraphNotFoundError,
    SynthGraphRateLimitError,
    SynthGraphServerError,
    SynthGraphValidationError,
    error_for_status,
    extract_error_message,
)


@pytest.mark.parametrize(
    ("status", "expected"),
    [
        (400, SynthGraphValidationError),
        (401, SynthGraphAuthenticationError),
        (403, SynthGraphAuthorizationError),
        (404, SynthGraphNotFoundError),
        (409, SynthGraphConflictError),
        (422, SynthGraphValidationError),
        (429, SynthGraphRateLimitError),
        (500, SynthGraphServerError),
        (503, SynthGraphServerError),
        (418, SynthGraphHTTPError),
    ],
)
def test_status_mapping_is_deterministic(status, expected):
    error = error_for_status(status, message="boom", operation="op", path="/p")
    assert type(error) is expected
    assert isinstance(error, SynthGraphError)


def test_http_errors_share_a_catchable_base():
    error = error_for_status(404, message="gone")
    assert isinstance(error, SynthGraphHTTPError)
    assert error.status_code == 404


def test_error_carries_safe_context_only():
    error = error_for_status(
        500,
        message="Internal error",
        operation="generations.get",
        path="/generations/g1",
    )
    assert error.operation == "generations.get"
    assert error.path == "/generations/g1"
    assert "Internal error" in str(error)


def test_extract_message_handles_nest_shapes():
    assert extract_error_message({"message": "Project not found"}, "fallback") == (
        "Project not found"
    )
    assert extract_error_message(
        {"message": ["name must be a string", "name should not be empty"]}, "fallback"
    ) == "name must be a string; name should not be empty"
    assert extract_error_message({"error": "Bad Request"}, "fallback") == "Bad Request"


def test_extract_message_falls_back_for_untrusted_shapes():
    assert extract_error_message({"message": {"nested": "object"}}, "fallback") == "fallback"
    assert extract_error_message("<html>stack trace</html>", "fallback") == "fallback"
    assert extract_error_message(None, "fallback") == "fallback"
