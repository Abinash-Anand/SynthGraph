from __future__ import annotations

import httpx
import pytest

from synthgraph import SynthGraph, SynthGraphClient, SynthGraphConfig
from synthgraph.errors import SynthGraphConfigurationError

from .conftest import API_KEY, API_URL, experiment_payload, project_payload


def test_client_exposes_every_resource(client):
    for name in (
        "auth",
        "projects",
        "experiments",
        "generations",
        "datasets",
        "training_runs",
        "evaluations",
        "reproduction",
        "documentation",
        "comparisons",
    ):
        assert hasattr(client, name), name


def test_synthgraph_alias_is_the_client():
    assert SynthGraph is SynthGraphClient


def test_config_cannot_be_combined_with_shortcuts():
    with pytest.raises(ValueError):
        SynthGraphClient(api_key="k", config=SynthGraphConfig(api_key="k"))


def test_client_reads_the_environment(monkeypatch, backend):
    monkeypatch.setenv("SYNTHGRAPH_API_KEY", "from-env")
    monkeypatch.setenv("SYNTHGRAPH_API_URL", "http://env.test")

    with SynthGraphClient(transport=backend.transport) as sdk:
        assert sdk.config.api_key == "from-env"
        assert sdk.config.api_url == "http://env.test"


def test_context_manager_closes_the_transport(backend):
    backend.route("GET", "/auth/me", httpx.Response(200, json={"id": "u1"}))
    with SynthGraphClient(api_key=API_KEY, api_url=API_URL, transport=backend.transport) as sdk:
        sdk.auth.me()
    assert sdk._http._client.is_closed


def test_whoami_uses_auth_me(client, backend):
    backend.route("GET", "/auth/me", httpx.Response(200, json={"id": "u1", "email": "a@b.c"}))
    assert client.whoami().email == "a@b.c"


def test_project_creates_by_name(client, backend):
    backend.route("POST", "/projects", httpx.Response(201, json=project_payload()))
    handle = client.project("Rain research")
    assert handle.id == "p1"
    assert backend.last().method == "POST"


def test_project_opens_by_id(client, backend):
    backend.route("GET", "/projects/p1", httpx.Response(200, json=project_payload()))
    handle = client.project(id="p1")
    assert handle.id == "p1"
    assert backend.last().method == "GET"


def test_project_will_not_guess_between_create_and_open(client):
    with pytest.raises(SynthGraphConfigurationError):
        client.project()
    with pytest.raises(SynthGraphConfigurationError):
        client.project("Rain", id="p1")


def test_experiment_uses_the_configured_default_project(backend):
    backend.route(
        "POST", "/projects/p9/experiments", httpx.Response(201, json=experiment_payload())
    )

    with SynthGraphClient(
        api_key=API_KEY, api_url=API_URL, project_id="p9", transport=backend.transport
    ) as sdk:
        sdk.experiment("vehicle_detection_rain")

    assert backend.last().path == "/projects/p9/experiments"


def test_experiment_without_a_project_explains_the_options(client):
    with pytest.raises(SynthGraphConfigurationError) as excinfo:
        client.experiment("vehicle_detection_rain")
    assert "SYNTHGRAPH_PROJECT_ID" in str(excinfo.value)


def test_experiment_opens_by_id(client, backend):
    backend.route("GET", "/experiments/e1", httpx.Response(200, json=experiment_payload()))
    assert client.experiment(id="e1").id == "e1"
