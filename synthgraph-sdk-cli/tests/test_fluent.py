"""The capture ergonomics, including documented context-manager semantics."""

from __future__ import annotations

import json

import httpx
import pytest

from synthgraph.errors import SynthGraphServerError, SynthGraphValidationError

from .conftest import experiment_payload, generation_payload, project_payload


@pytest.fixture
def experiment(client, backend):
    backend.route("POST", "/projects", httpx.Response(201, json=project_payload()))
    backend.route(
        "POST", "/projects/p1/experiments", httpx.Response(201, json=experiment_payload())
    )
    return client.project("Rain research").experiment("vehicle_detection_rain")


def _generation_routes(backend, *, created_status="pending"):
    backend.route(
        "POST",
        "/experiments/e1/generations",
        httpx.Response(201, json=generation_payload(status=created_status)),
    )
    backend.route(
        "PATCH",
        "/generations/g1",
        lambda request: httpx.Response(
            200,
            json=generation_payload(status=json.loads(request.content)["status"]),
        ),
    )


def test_generation_is_created_pending_not_started(experiment, backend):
    _generation_routes(backend)

    generation = experiment.generation(generator="blender", parameters={"weather": "rain"})

    assert generation.status == "pending"
    assert [request.method for request in backend.requests][-1] == "POST"


def test_generation_is_named_after_its_generator_by_default(experiment, backend):
    _generation_routes(backend)
    experiment.generation(generator="blender", parameters={})
    assert backend.last().body["name"] == "blender"


def test_context_manager_starts_then_completes(experiment, backend):
    _generation_routes(backend)

    with experiment.generation(generator="blender", parameters={}) as generation:
        assert generation.status == "running"

    assert generation.status == "completed"
    statuses = [r.body["status"] for r in backend.requests if r.method == "PATCH"]
    assert statuses == ["running", "completed"]


def test_context_manager_fails_and_reraises(experiment, backend):
    _generation_routes(backend)

    with pytest.raises(RuntimeError, match="blender crashed"):
        with experiment.generation(generator="blender", parameters={}) as generation:
            raise RuntimeError("blender crashed")

    assert generation.status == "failed"
    statuses = [r.body["status"] for r in backend.requests if r.method == "PATCH"]
    assert statuses == ["running", "failed"]


def test_researcher_exception_survives_a_failed_lifecycle_call(experiment, backend):
    """A bookkeeping failure must not mask what actually went wrong."""
    backend.route(
        "POST", "/experiments/e1/generations", httpx.Response(201, json=generation_payload())
    )
    patches = [
        httpx.Response(200, json=generation_payload(status="running")),
        httpx.Response(500, json={"message": "backend down"}),
    ]
    backend.route("PATCH", "/generations/g1", lambda _request: patches.pop(0))

    with pytest.raises(RuntimeError, match="blender crashed"):
        with experiment.generation(generator="blender", parameters={}):
            raise RuntimeError("blender crashed")


def test_a_backend_failure_on_complete_is_reported(experiment, backend):
    """The SDK never claims provenance was saved when it was not (spec 7.5)."""
    backend.route(
        "POST", "/experiments/e1/generations", httpx.Response(201, json=generation_payload())
    )
    patches = [
        httpx.Response(200, json=generation_payload(status="running")),
        httpx.Response(500, json={"message": "backend down"}),
    ]
    backend.route("PATCH", "/generations/g1", lambda _request: patches.pop(0))

    with pytest.raises(SynthGraphServerError):
        with experiment.generation(generator="blender", parameters={}):
            pass


def test_already_running_generation_is_not_restarted(experiment, backend):
    _generation_routes(backend, created_status="running")

    with experiment.generation(generator="blender", parameters={}):
        pass

    statuses = [r.body["status"] for r in backend.requests if r.method == "PATCH"]
    assert statuses == ["completed"]


def test_terminal_generation_is_left_alone(experiment, backend):
    _generation_routes(backend, created_status="completed")

    with experiment.generation(generator="blender", parameters={}):
        pass

    assert [r for r in backend.requests if r.method == "PATCH"] == []


def test_generation_records_a_dataset(experiment, backend):
    _generation_routes(backend)
    backend.route(
        "POST",
        "/generations/g1/datasets",
        httpx.Response(201, json={"id": "dv1", "uri": "/data/rain_v1"}),
    )

    generation = experiment.generation(generator="blender", parameters={})
    dataset = generation.dataset(name="rain_v1", uri="/data/rain_v1")

    assert dataset.id == "dv1"


def test_training_accepts_a_dataset_handle(experiment, backend):
    backend.route(
        "POST",
        "/experiments/e1/training-runs",
        httpx.Response(201, json={"id": "t1", "model": "yolo"}),
    )
    backend.route(
        "POST",
        "/training-runs/t1/evaluation-results",
        httpx.Response(201, json={"id": "ev1", "metrics": {"mAP": 0.724}}),
    )

    training = experiment.training(model="yolo", framework="pytorch", dataset="dv1")
    assert backend.requests[-1].body["datasets"] == [{"id": "dv1"}]

    evaluation = training.evaluation(metrics={"mAP": 0.724})
    assert evaluation.metrics["mAP"] == 0.724


def test_training_rejects_dataset_and_datasets_together(experiment):
    with pytest.raises(SynthGraphValidationError):
        experiment.training(model="yolo", dataset="dv1", datasets=["dv2"])


def test_experiment_context_manager_has_no_side_effects(experiment, backend):
    before = len(backend.requests)
    with experiment as same:
        assert same is experiment
    assert len(backend.requests) == before
