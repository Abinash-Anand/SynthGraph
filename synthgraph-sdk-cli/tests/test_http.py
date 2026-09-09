"""Transport behaviour: headers, request construction, retries, error mapping."""

from __future__ import annotations

import httpx
import pytest

from synthgraph import RetryPolicy, SynthGraphConfig
from synthgraph.errors import (
    SynthGraphAuthenticationError,
    SynthGraphNotFoundError,
    SynthGraphServerError,
    SynthGraphTransportError,
    SynthGraphValidationError,
)
from synthgraph.http import SynthGraphHTTPClient

from .conftest import API_KEY, API_URL, MockBackend


def build_http(backend: MockBackend, **config_kwargs) -> SynthGraphHTTPClient:
    config_kwargs.setdefault("api_key", API_KEY)
    config_kwargs.setdefault("api_url", API_URL)
    return SynthGraphHTTPClient(
        SynthGraphConfig(**config_kwargs),
        transport=backend.transport,
        sleep=lambda _seconds: None,
    )


def test_authorization_header_is_sent(backend):
    backend.route("GET", "/auth/me", httpx.Response(200, json={"id": "u1"}))
    build_http(backend).get("/auth/me")
    assert backend.last().headers["authorization"] == f"Bearer {API_KEY}"


def test_no_authorization_header_without_a_key(backend):
    backend.route("GET", "/auth/me", httpx.Response(200, json={"id": "u1"}))
    build_http(backend, api_key=None).get("/auth/me")
    assert "authorization" not in backend.last().headers


def test_user_agent_identifies_the_sdk(backend):
    backend.route("GET", "/projects", httpx.Response(200, json={}))
    build_http(backend).get("/projects")
    assert backend.last().headers["user-agent"].startswith("synthgraph-python/")


def test_none_query_parameters_are_dropped(backend):
    backend.route("GET", "/projects/p1/experiments", httpx.Response(200, json=[]))
    build_http(backend).get_list("/projects/p1/experiments", params={"search": None})
    assert backend.last().query == {}


def test_empty_body_is_an_empty_object(backend):
    backend.route("GET", "/projects/p1", httpx.Response(204))
    assert build_http(backend).get("/projects/p1") == {}


def test_object_response_must_be_an_object(backend):
    backend.route("GET", "/projects/p1", httpx.Response(200, json=["not", "an", "object"]))
    with pytest.raises(SynthGraphTransportError):
        build_http(backend).get("/projects/p1")


def test_list_response_must_be_a_list_of_objects(backend):
    backend.route("GET", "/projects", httpx.Response(200, json=[1, 2, 3]))
    with pytest.raises(SynthGraphTransportError):
        build_http(backend).get_list("/projects")


def test_invalid_json_is_a_transport_error(backend):
    backend.route("GET", "/projects", httpx.Response(200, text="<html>oops</html>"))
    with pytest.raises(SynthGraphTransportError):
        build_http(backend).get_list("/projects")


@pytest.mark.parametrize(
    ("status", "expected"),
    [
        (401, SynthGraphAuthenticationError),
        (404, SynthGraphNotFoundError),
        (400, SynthGraphValidationError),
        (500, SynthGraphServerError),
    ],
)
def test_error_statuses_map_to_the_taxonomy(backend, status, expected):
    backend.route("GET", "/projects/p1", httpx.Response(status, json={"message": "nope"}))
    with pytest.raises(expected):
        build_http(backend).get("/projects/p1", operation="projects.get")


def test_error_keeps_operation_and_path(backend):
    backend.route("GET", "/projects/p1", httpx.Response(404, json={"message": "Not found"}))
    with pytest.raises(SynthGraphNotFoundError) as excinfo:
        build_http(backend).get("/projects/p1", operation="projects.get")
    assert excinfo.value.operation == "projects.get"
    assert excinfo.value.path == "/projects/p1"
    assert excinfo.value.message == "Not found"


def test_get_is_retried_on_transient_status(backend):
    responses = [
        httpx.Response(503, json={"message": "unavailable"}),
        httpx.Response(200, json={"id": "p1"}),
    ]
    backend.route("GET", "/projects/p1", lambda _request: responses.pop(0))

    result = build_http(backend, retry=RetryPolicy(max_attempts=3, backoff_factor=0)).get(
        "/projects/p1"
    )

    assert result == {"id": "p1"}
    assert len(backend.requests) == 2


def test_get_stops_retrying_after_max_attempts(backend):
    backend.route("GET", "/projects/p1", httpx.Response(503, json={"message": "unavailable"}))

    with pytest.raises(SynthGraphServerError):
        build_http(backend, retry=RetryPolicy(max_attempts=2, backoff_factor=0)).get(
            "/projects/p1"
        )

    assert len(backend.requests) == 2


def test_writes_are_never_retried(backend):
    """A retried POST could duplicate provenance (spec 33)."""
    backend.route("POST", "/projects", httpx.Response(503, json={"message": "unavailable"}))

    with pytest.raises(SynthGraphServerError):
        build_http(backend, retry=RetryPolicy(max_attempts=5, backoff_factor=0)).post(
            "/projects", json={"name": "x"}
        )

    assert len(backend.requests) == 1


def test_write_transport_failure_reports_unknown_outcome(backend):
    def explode(_request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("connection reset")

    backend.route("POST", "/projects", explode)

    with pytest.raises(SynthGraphTransportError) as excinfo:
        build_http(backend).post("/projects", json={"name": "x"})

    assert excinfo.value.outcome_unknown is True
    assert len(backend.requests) == 1


def test_get_transport_failure_is_retried_then_raised(backend):
    def explode(_request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectTimeout("timed out")

    backend.route("GET", "/projects", explode)

    with pytest.raises(SynthGraphTransportError) as excinfo:
        build_http(backend, retry=RetryPolicy(max_attempts=3, backoff_factor=0)).get_list(
            "/projects"
        )

    assert excinfo.value.outcome_unknown is False
    assert len(backend.requests) == 3


def test_get_text_returns_markdown(backend):
    backend.route(
        "GET",
        "/generations/g1/documentation",
        httpx.Response(200, text="# Title\n", headers={"content-type": "text/markdown"}),
    )
    assert build_http(backend).get_text("/generations/g1/documentation") == "# Title\n"


def test_get_text_unwraps_json_wrapped_markdown(backend):
    backend.route(
        "GET",
        "/generations/g1/documentation",
        httpx.Response(200, json={"documentation": "# Title"}),
    )
    assert build_http(backend).get_text("/generations/g1/documentation") == "# Title"


def test_http_client_closes_via_context_manager(backend):
    backend.route("GET", "/auth/me", httpx.Response(200, json={"id": "u1"}))
    with build_http(backend) as http:
        http.get("/auth/me")
