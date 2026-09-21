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
        "POST", "/datasets", httpx.Response(201, json={"id": "d1", "name": "rain_v1"})
    )
    backend.route(
        "POST",
        "/datasets/d1/versions",
        httpx.Response(201, json={"id": "dv1", "dataset_id": "d1", "uri": "/data/rain_v1"}),
    )
    backend.route(
        "POST",
        "/generations/g1/datasets",
        httpx.Response(201, json={"dataset_version_id": "dv1", "role": "output"}),
    )

    generation = experiment.generation(generator="blender", parameters={})
    dataset = generation.dataset(name="rain_v1", uri="/data/rain_v1")

    assert dataset.id == "dv1"


def test_generation_records_an_asset(experiment, backend):
    _generation_routes(backend)
    backend.route(
        "POST",
        "/assets",
        httpx.Response(201, json={"id": "a1", "name": "rain_render", "type": "video"}),
    )
    backend.route(
        "POST",
        "/assets/a1/versions",
        httpx.Response(
            201, json={"id": "av1", "asset_id": "a1", "uri": "/data/rain_render.mp4"}
        ),
    )
    backend.route(
        "POST",
        "/generations/g1/assets",
        httpx.Response(201, json={"assetVersionId": "av1", "role": "output"}),
    )

    generation = experiment.generation(generator="blender", parameters={})
    asset = generation.asset(name="rain_render", uri="/data/rain_render.mp4", type="video")

    assert asset.id == "av1"
    assert [r.path for r in backend.requests if r.method == "POST"][-3:] == [
        "/assets",
        "/assets/a1/versions",
        "/generations/g1/assets",
    ]


def test_training_accepts_a_dataset_handle(experiment, backend):
    backend.route(
        "POST",
        "/experiments/e1/training-runs",
        httpx.Response(201, json={"id": "t1", "trainer": {"name": "yolo"}}),
    )
    backend.route(
        "POST",
        "/training-runs/t1/datasets",
        httpx.Response(201, json={"id": "t1", "trainer": {"name": "yolo"}}),
    )
    backend.route(
        "GET",
        "/training-runs/t1",
        httpx.Response(
            201,
            json={"id": "t1", "trainer": {"name": "yolo"}, "datasets": [{"id": "dv1"}]},
        ),
    )
    backend.route(
        "POST",
        "/training-runs/t1/evaluations",
        httpx.Response(201, json={"id": "ev1", "metrics": {"mAP": 0.724}}),
    )

    training = experiment.training(model="yolo", framework="pytorch", dataset="dv1")
    attach_request = next(r for r in backend.requests if r.path == "/training-runs/t1/datasets")
    assert attach_request.body == {"dataset_version_id": "dv1", "role": "training"}

    evaluation = training.evaluation(metrics={"mAP": 0.724}, dataset_version_id="dv1")
    assert evaluation.metrics["mAP"] == 0.724


def test_training_handle_lifecycle_reassigns_the_training_run(experiment, backend):
    backend.route(
        "POST",
        "/experiments/e1/training-runs",
        httpx.Response(201, json={"id": "t1", "status": "pending"}),
    )
    backend.route(
        "PATCH",
        "/training-runs/t1",
        lambda request: httpx.Response(
            200, json={"id": "t1", "status": json.loads(request.content)["status"]}
        ),
    )

    training = experiment.training(model="yolo")

    training.start()
    assert training.training_run.status == "running"

    training.complete()
    assert training.training_run.status == "completed"


def test_training_handle_fail(experiment, backend):
    backend.route(
        "POST",
        "/experiments/e1/training-runs",
        httpx.Response(201, json={"id": "t1", "status": "pending"}),
    )
    backend.route(
        "PATCH",
        "/training-runs/t1",
        lambda request: httpx.Response(
            200, json={"id": "t1", "status": json.loads(request.content)["status"]}
        ),
    )

    training = experiment.training(model="yolo")
    training.fail()

    assert training.training_run.status == "failed"


def test_training_rejects_dataset_and_datasets_together(experiment):
    with pytest.raises(SynthGraphValidationError):
        experiment.training(model="yolo", dataset="dv1", datasets=["dv2"])


def test_experiment_context_manager_has_no_side_effects(experiment, backend):
    before = len(backend.requests)
    with experiment as same:
        assert same is experiment
    assert len(backend.requests) == before
