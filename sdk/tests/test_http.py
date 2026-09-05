import json

import httpx
import pytest

from synthgraph.config import SynthGraphConfig
from synthgraph.http import SynthGraphHTTPClient, SynthGraphHTTPError


def test_client_uses_configured_api_url() -> None:
    config = SynthGraphConfig(
        api_url="https://api.example.com",
    )

    def handler(request: httpx.Request) -> httpx.Response:
        assert str(request.url) == "https://api.example.com/projects"
        return httpx.Response(
            200,
            json={"projects": []},
        )

    transport = httpx.MockTransport(handler)

    with SynthGraphHTTPClient(
        config,
        transport=transport,
    ) as client:
        response = client.get("/projects")

    assert response == {"projects": []}


def test_client_sends_authentication_header() -> None:
    config = SynthGraphConfig(
        api_url="https://api.example.com",
        api_key="test-api-key",
    )

    def handler(request: httpx.Request) -> httpx.Response:
        assert request.headers["Authorization"] == "Bearer test-api-key"
        return httpx.Response(
            200,
            json={"authenticated": True},
        )

    transport = httpx.MockTransport(handler)

    with SynthGraphHTTPClient(
        config,
        transport=transport,
    ) as client:
        response = client.get("/test")

    assert response == {"authenticated": True}


def test_client_omits_authentication_header_without_api_key() -> None:
    config = SynthGraphConfig(
        api_url="https://api.example.com",
    )

    def handler(request: httpx.Request) -> httpx.Response:
        assert "Authorization" not in request.headers
        return httpx.Response(
            200,
            json={"authenticated": False},
        )

    transport = httpx.MockTransport(handler)

    with SynthGraphHTTPClient(
        config,
        transport=transport,
    ) as client:
        response = client.get("/test")

    assert response == {"authenticated": False}


def test_client_sends_post_json_body() -> None:
    config = SynthGraphConfig(
        api_url="https://api.example.com",
    )

    def handler(request: httpx.Request) -> httpx.Response:
        assert request.method == "POST"
        assert request.headers["Content-Type"] == "application/json"
        assert json.loads(request.content) == {
            "name": "test-project",
        }

        return httpx.Response(
            201,
            json={
                "id": "project_123",
                "name": "test-project",
            },
        )

    transport = httpx.MockTransport(handler)

    with SynthGraphHTTPClient(
        config,
        transport=transport,
    ) as client:
        response = client.post(
            "/projects",
            json={"name": "test-project"},
        )

    assert response == {
        "id": "project_123",
        "name": "test-project",
    }


def test_client_handles_api_error() -> None:
    config = SynthGraphConfig(
        api_url="https://api.example.com",
    )

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            400,
            json={
                "detail": "Invalid project",
            },
        )

    transport = httpx.MockTransport(handler)

    with pytest.raises(
        SynthGraphHTTPError
    ) as exc_info, SynthGraphHTTPClient(
        config,
        transport=transport,
    ) as client:
        client.post("/projects", json={})

    assert exc_info.value.status_code == 400
    assert exc_info.value.message == "Invalid project"


def test_client_handles_error_without_json_body() -> None:
    config = SynthGraphConfig(
        api_url="https://api.example.com",
    )

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            500,
            text="Internal server error",
        )

    transport = httpx.MockTransport(handler)

    with pytest.raises(
        SynthGraphHTTPError
    ) as exc_info, SynthGraphHTTPClient(
        config,
        transport=transport,
    ) as client:
        client.get("/projects")

    assert exc_info.value.status_code == 500
    assert exc_info.value.message == "Internal server error"


def test_client_rejects_non_object_json_response() -> None:
    config = SynthGraphConfig(
        api_url="https://api.example.com",
    )

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200,
            json=["project_123"],
        )

    transport = httpx.MockTransport(handler)

    with pytest.raises(
        SynthGraphHTTPError
    ) as exc_info, SynthGraphHTTPClient(
        config,
        transport=transport,
    ) as client:
        client.get("/projects")

    assert exc_info.value.status_code == 200
    assert exc_info.value.message == "API response must be a JSON object"


def test_client_supports_empty_response() -> None:
    config = SynthGraphConfig(
        api_url="https://api.example.com",
    )

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(204)

    transport = httpx.MockTransport(handler)

    with SynthGraphHTTPClient(
        config,
        transport=transport,
    ) as client:
        response = client.post("/projects")

    assert response == {}