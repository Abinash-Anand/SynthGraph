from __future__ import annotations

import httpx
import pytest

from synthgraph.errors import SynthGraphValidationError

from .conftest import experiment_payload


def test_create_posts_under_the_project(client, backend):
    backend.route(
        "POST", "/projects/p1/experiments", httpx.Response(201, json=experiment_payload())
    )

    experiment = client.experiments.create(project_id="p1", name="vehicle_detection_rain")

    assert backend.last().path == "/projects/p1/experiments"
    assert backend.last().body == {"name": "vehicle_detection_rain"}
    assert experiment.project_id == "p1"


def test_list_sends_no_search_parameter_by_default(client, backend):
    backend.route("GET", "/projects/p1/experiments", httpx.Response(200, json=[]))

    client.experiments.list(project_id="p1")

    assert backend.last().query == {}


def test_list_passes_search_to_the_backend(client, backend):
    backend.route(
        "GET", "/projects/p1/experiments", httpx.Response(200, json=[experiment_payload()])
    )

    client.experiments.list(project_id="p1", search="rain")

    assert backend.last().query == {"search": "rain"}


def test_search_is_the_same_backend_filter(client, backend):
    backend.route(
        "GET", "/projects/p1/experiments", httpx.Response(200, json=[experiment_payload()])
    )

    results = client.experiments.search(project_id="p1", query="rain")

    assert backend.last().query == {"search": "rain"}
    assert results[0].name == "vehicle_detection_rain"


def test_get_uses_the_top_level_experiment_route(client, backend):
    backend.route("GET", "/experiments/e1", httpx.Response(200, json=experiment_payload()))

    client.experiments.get("e1")

    assert backend.last().path == "/experiments/e1"


def test_blank_project_id_is_rejected_before_sending(client, backend):
    with pytest.raises(SynthGraphValidationError):
        client.experiments.list(project_id="")
    assert backend.requests == []
