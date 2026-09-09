from __future__ import annotations

import httpx
import pytest

from synthgraph.errors import SynthGraphNotFoundError, SynthGraphValidationError

from .conftest import project_payload


def test_create_sends_only_what_was_given(client, backend):
    backend.route("POST", "/projects", httpx.Response(201, json=project_payload()))

    project = client.projects.create(name="Rain research")

    assert backend.last().body == {"name": "Rain research"}
    assert project.id == "p1"


def test_create_includes_optional_fields(client, backend):
    backend.route("POST", "/projects", httpx.Response(201, json=project_payload()))

    client.projects.create(name="Rain", description="d", metadata={"lab": "cv"})

    assert backend.last().body == {
        "name": "Rain",
        "description": "d",
        "metadata": {"lab": "cv"},
    }


def test_create_rejects_a_blank_name_before_sending(client, backend):
    with pytest.raises(SynthGraphValidationError):
        client.projects.create(name="   ")
    assert backend.requests == []


def test_get_uses_the_project_route(client, backend):
    backend.route("GET", "/projects/p1", httpx.Response(200, json=project_payload()))

    client.projects.get("p1")

    assert backend.last().method == "GET"
    assert backend.last().path == "/projects/p1"


def test_get_encodes_the_identifier(client, backend):
    backend.default(httpx.Response(200, json=project_payload()))

    client.projects.get("p 1")

    assert backend.last().raw_path == "/projects/p%201"


def test_get_rejects_identifiers_that_would_change_the_path(client, backend):
    with pytest.raises(SynthGraphValidationError):
        client.projects.get("../auth/me")
    assert backend.requests == []


def test_list_returns_models(client, backend):
    backend.route(
        "GET",
        "/projects",
        httpx.Response(200, json=[project_payload(), project_payload(id="p2", name="Snow")]),
    )

    projects = client.projects.list()

    assert [project.id for project in projects] == ["p1", "p2"]


def test_list_handles_an_empty_backend(client, backend):
    backend.route("GET", "/projects", httpx.Response(200, json=[]))
    assert client.projects.list() == []


def test_missing_project_raises_not_found(client, backend):
    backend.route("GET", "/projects/nope", httpx.Response(404, json={"message": "Not found"}))
    with pytest.raises(SynthGraphNotFoundError):
        client.projects.get("nope")
