"""The capture ergonomics, including documented context-manager semantics."""

from __future__ import annotations

import json
import warnings

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
    assert attach_request.body == {"datasetVersionId": "dv1", "role": "training"}

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


def test_training_handle_log_metric(experiment, backend):
    backend.route(
        "POST",
        "/experiments/e1/training-runs",
        httpx.Response(201, json={"id": "t1", "status": "pending"}),
    )
    backend.route(
        "POST",
        "/training-runs/t1/metrics",
        httpx.Response(
            201, json={"id": "m1", "training_run_id": "t1", "step": 100, "metrics": {"loss": 0.42}}
        ),
    )

    training = experiment.training(model="yolo")
    metric = training.log_metric(step=100, metrics={"loss": 0.42})

    assert backend.last().path == "/training-runs/t1/metrics"
    assert backend.last().body == {"step": 100, "metrics": {"loss": 0.42}}
    assert metric.step == 100
    assert metric.metrics["loss"] == 0.42


def test_training_handle_metrics_lists_points_for_this_run(experiment, backend):
    backend.route(
        "POST",
        "/experiments/e1/training-runs",
        httpx.Response(201, json={"id": "t1", "status": "pending"}),
    )
    backend.route(
        "GET",
        "/training-runs/t1/metrics",
        httpx.Response(
            200,
            json=[
                {"id": "m1", "training_run_id": "t1", "step": 100, "metrics": {"loss": 0.42}},
                {"id": "m2", "training_run_id": "t1", "step": 200, "metrics": {"loss": 0.31}},
            ],
        ),
    )

    training = experiment.training(model="yolo")
    points = training.metrics()

    assert backend.last().path == "/training-runs/t1/metrics"
    assert [point.step for point in points] == [100, 200]


def test_experiment_training_runs_lists_and_filters_by_capture_status(experiment, backend):
    backend.route(
        "GET",
        "/experiments/e1/training-runs",
        httpx.Response(200, json=[{"id": "t1", "status": "pending"}]),
    )

    runs = experiment.training_runs()
    assert [run.id for run in runs] == ["t1"]
    assert backend.last().query == {}

    experiment.training_runs(capture_status="partial")
    assert backend.last().query == {"captureStatus": "partial"}


def test_experiment_context_manager_has_no_side_effects(experiment, backend):
    before = len(backend.requests)
    with experiment as same:
        assert same is experiment
    assert len(backend.requests) == before


def _route_training_run_and_capture_status(backend):
    backend.route(
        "POST",
        "/experiments/e1/training-runs",
        httpx.Response(201, json={"id": "t1", "status": "pending"}),
    )
    backend.route(
        "PATCH",
        "/training-runs/t1/capture-status",
        lambda request: httpx.Response(
            200, json={"id": "t1", "status": "pending", "captureStatus": None}
        ),
    )


def test_training_close_runs_every_registered_integration_closer(experiment, backend):
    _route_training_run_and_capture_status(backend)

    training = experiment.training(model="yolo")
    closed: list[str] = []
    training._integration_session.register(lambda: closed.append("resource_monitor"), name="rm")
    training._integration_session.register(lambda: closed.append("skrl_writer"), name="writer")

    training.close()

    assert closed == ["resource_monitor", "skrl_writer"]


def test_training_close_is_safe_to_call_twice(experiment, backend):
    _route_training_run_and_capture_status(backend)

    training = experiment.training(model="yolo")
    calls: list[str] = []
    training._integration_session.register(lambda: calls.append("x"), name="x")

    training.close()
    training.close()

    assert calls == ["x"]


def test_training_close_only_reports_capture_status_once(experiment, backend):
    """The second close() must not re-send the same report - the exact
    duplicate-report risk IntegrationSession.close()'s bool return exists to
    prevent."""
    _route_training_run_and_capture_status(backend)

    training = experiment.training(model="yolo")
    training._integration_session.register(lambda: None, name="x")

    training.close()
    training.close()

    capture_status_requests = [
        r for r in backend.requests if r.path == "/training-runs/t1/capture-status"
    ]
    assert len(capture_status_requests) == 1


def test_training_close_reports_complete_when_every_integration_closes_cleanly(
    experiment, backend
):
    _route_training_run_and_capture_status(backend)

    training = experiment.training(model="yolo")
    training._integration_session.register(lambda: None, name="resource_monitor")

    training.close()

    request = next(
        r for r in backend.requests if r.path == "/training-runs/t1/capture-status"
    )
    assert request.body == {
        "status": "complete",
        "integrations": {"resource_monitor": {"attached": True, "closed": True}},
    }


def test_training_close_reports_partial_when_a_closer_fails(experiment, backend):
    _route_training_run_and_capture_status(backend)

    training = experiment.training(model="yolo")
    training._integration_session.register(lambda: None, name="ok")

    def boom():
        raise RuntimeError("simulated close failure")

    training._integration_session.register(boom, name="broken")

    with warnings.catch_warnings():
        warnings.simplefilter("ignore")  # the closer's own failure warning
        training.close()

    request = next(
        r for r in backend.requests if r.path == "/training-runs/t1/capture-status"
    )
    assert request.body == {
        "status": "partial",
        "integrations": {
            "ok": {"attached": True, "closed": True},
            "broken": {"attached": True, "closed": False},
        },
    }


def test_training_close_does_not_report_when_nothing_was_attached(experiment, backend):
    _route_training_run_and_capture_status(backend)

    training = experiment.training(model="yolo")
    training.close()

    assert not any(r.path == "/training-runs/t1/capture-status" for r in backend.requests)


def test_a_failed_capture_status_report_warns_but_does_not_raise(experiment, backend):
    backend.route(
        "POST",
        "/experiments/e1/training-runs",
        httpx.Response(201, json={"id": "t1", "status": "pending"}),
    )
    # No capture-status route configured - the mock backend 404s, mapped to
    # SynthGraphNotFoundError, which close() must catch rather than raise.

    training = experiment.training(model="yolo")
    training._integration_session.register(lambda: None, name="x")

    with warnings.catch_warnings(record=True) as caught:
        warnings.simplefilter("always")
        training.close()  # must not raise

    assert any("SynthGraph capture-status report failed" in str(w.message) for w in caught)


def test_training_context_manager_closes_integrations_on_normal_exit(experiment, backend):
    _route_training_run_and_capture_status(backend)

    calls: list[str] = []
    with experiment.training(model="yolo") as training:
        training._integration_session.register(lambda: calls.append("closed"), name="x")
        assert calls == []

    assert calls == ["closed"]


def test_training_context_manager_closes_integrations_and_reraises_on_exception(
    experiment, backend
):
    _route_training_run_and_capture_status(backend)

    calls: list[str] = []
    with pytest.raises(RuntimeError, match="researcher's own bug"):
        with experiment.training(model="yolo") as training:
            training._integration_session.register(lambda: calls.append("closed"), name="x")
            raise RuntimeError("researcher's own bug")

    assert calls == ["closed"]


def test_training_context_manager_does_not_change_status(experiment, backend):
    """Unlike GenerationHandle, leaving a training `with` block must not
    call start()/complete()/fail() - close() is only about integrations."""
    backend.route(
        "POST",
        "/experiments/e1/training-runs",
        httpx.Response(201, json={"id": "t1", "status": "pending"}),
    )

    with experiment.training(model="yolo") as training:
        pass

    assert training.training_run.status == "pending"
    assert not any(r.method == "PATCH" for r in backend.requests)
