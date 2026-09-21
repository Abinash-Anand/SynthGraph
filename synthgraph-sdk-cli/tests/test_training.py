from __future__ import annotations

import httpx
import pytest

from synthgraph.errors import SynthGraphValidationError
from synthgraph.models import DatasetVersion

TRAINING_RUN = {
    "id": "t1",
    "experiment_id": "e1",
    "trainer": {"name": "yolo", "type": "pytorch"},
    "parameters": {"epochs": 50},
    "status": "pending",
}

TRAINING_RUN_METRIC = {
    "id": "m1",
    "training_run_id": "t1",
    "step": 100,
    "metrics": {"loss": 0.42},
}


def test_create_posts_under_the_experiment(client, backend):
    backend.route(
        "POST", "/experiments/e1/training-runs", httpx.Response(201, json=TRAINING_RUN)
    )

    run = client.training_runs.create(
        experiment_id="e1",
        model="yolo",
        framework="pytorch",
        config={"epochs": 50, "batch_size": 32},
        capture_environment=False,
    )

    assert backend.last().path == "/experiments/e1/training-runs"
    assert backend.last().body == {
        "trainer": {"name": "yolo", "type": "pytorch"},
        "parameters": {"epochs": 50, "batch_size": 32},
    }
    assert run.id == "t1"


def test_environment_is_captured_by_default(client, backend):
    backend.route("POST", "/experiments/e1/training-runs", httpx.Response(201, json=TRAINING_RUN))

    client.training_runs.create(experiment_id="e1", model="yolo")

    environment = backend.last().body["metadata"]["environment"]
    assert environment["python_implementation"] == "CPython"
    assert "os" in environment


def test_capture_environment_false_omits_metadata(client, backend):
    backend.route("POST", "/experiments/e1/training-runs", httpx.Response(201, json=TRAINING_RUN))

    client.training_runs.create(experiment_id="e1", model="yolo", capture_environment=False)

    assert "metadata" not in backend.last().body


def test_explicit_environment_key_in_metadata_is_not_overwritten(client, backend):
    backend.route("POST", "/experiments/e1/training-runs", httpx.Response(201, json=TRAINING_RUN))

    client.training_runs.create(
        experiment_id="e1",
        model="yolo",
        metadata={"environment": {"custom": "value"}},
    )

    assert backend.last().body["metadata"] == {"environment": {"custom": "value"}}


def test_model_framework_version_map_onto_trainer(client, backend):
    backend.route("POST", "/experiments/e1/training-runs", httpx.Response(201, json=TRAINING_RUN))

    client.training_runs.create(
        experiment_id="e1",
        model="yolo",
        framework="pytorch",
        framework_version="2.1",
        config={"epochs": 50},
    )

    assert backend.last().body["trainer"] == {
        "name": "yolo",
        "type": "pytorch",
        "version": "2.1",
    }
    assert backend.last().body["parameters"] == {"epochs": 50}
    assert "model" not in backend.last().body
    assert "framework" not in backend.last().body
    assert "config" not in backend.last().body


def test_parameters_defaults_to_empty_mapping_when_config_is_not_given(client, backend):
    backend.route("POST", "/experiments/e1/training-runs", httpx.Response(201, json=TRAINING_RUN))

    client.training_runs.create(experiment_id="e1", model="yolo")

    assert backend.last().body["parameters"] == {}


def test_model_is_required(client, backend):
    with pytest.raises(SynthGraphValidationError):
        client.training_runs.create(experiment_id="e1", model="")
    assert backend.requests == []


def test_status_cannot_be_set_on_create(client, backend):
    with pytest.raises(SynthGraphValidationError):
        client.training_runs.create(experiment_id="e1", model="yolo", status="running")
    assert backend.requests == []


def test_unsupported_dataset_input_is_rejected(client, backend):
    with pytest.raises(SynthGraphValidationError):
        client.training_runs.create(experiment_id="e1", model="yolo", datasets=[object()])
    assert backend.requests == []


def test_datasets_are_attached_after_create_and_run_is_refetched(client, backend):
    backend.route("POST", "/experiments/e1/training-runs", httpx.Response(201, json=TRAINING_RUN))
    backend.route(
        "POST", "/training-runs/t1/datasets", httpx.Response(201, json=TRAINING_RUN)
    )
    refetched = dict(TRAINING_RUN, datasets=[{"id": "dv1"}, {"id": "dv2"}, {"id": "dv3"}])
    backend.route("GET", "/training-runs/t1", httpx.Response(200, json=refetched))

    run = client.training_runs.create(
        experiment_id="e1",
        model="yolo",
        datasets=["dv1", DatasetVersion(id="dv2"), {"id": "dv3", "role": "validation"}],
    )

    attach_requests = [r for r in backend.requests if r.path == "/training-runs/t1/datasets"]
    assert [r.body for r in attach_requests] == [
        {"datasetVersionId": "dv1", "role": "training"},
        {"datasetVersionId": "dv2", "role": "training"},
        {"datasetVersionId": "dv3", "role": "training"},
    ]
    # No `datasets` on the create payload itself.
    create_request = next(r for r in backend.requests if r.path == "/experiments/e1/training-runs")
    assert "datasets" not in create_request.body
    # The final response is the re-fetched run, not the (stale) create response.
    assert [dv.id for dv in run.datasets] == ["dv1", "dv2", "dv3"]


def test_no_refetch_when_no_datasets_are_attached(client, backend):
    backend.route("POST", "/experiments/e1/training-runs", httpx.Response(201, json=TRAINING_RUN))

    client.training_runs.create(experiment_id="e1", model="yolo")

    assert [r.path for r in backend.requests] == ["/experiments/e1/training-runs"]


def test_list_and_get(client, backend):
    backend.route("GET", "/experiments/e1/training-runs", httpx.Response(200, json=[TRAINING_RUN]))
    backend.route("GET", "/training-runs/t1", httpx.Response(200, json=TRAINING_RUN))

    assert [run.id for run in client.training_runs.list(experiment_id="e1")] == ["t1"]
    assert client.training_runs.get("t1").id == "t1"


def test_add_dataset_sends_dataset_version_id_and_role(client, backend):
    backend.route(
        "POST", "/training-runs/t1/datasets", httpx.Response(200, json=TRAINING_RUN)
    )

    client.training_runs.add_dataset(training_run_id="t1", dataset="dv9", role="validation")

    assert backend.last().path == "/training-runs/t1/datasets"
    assert backend.last().body == {"datasetVersionId": "dv9", "role": "validation"}


def test_add_dataset_role_defaults_to_training(client, backend):
    backend.route(
        "POST", "/training-runs/t1/datasets", httpx.Response(200, json=TRAINING_RUN)
    )

    client.training_runs.add_dataset(training_run_id="t1", dataset="dv9")

    assert backend.last().body == {"datasetVersionId": "dv9", "role": "training"}


@pytest.mark.parametrize(
    ("method_name", "status"),
    [("start", "running"), ("complete", "completed"), ("fail", "failed")],
)
def test_lifecycle_methods_patch_status(client, backend, method_name, status):
    backend.route(
        "PATCH",
        "/training-runs/t1",
        lambda request: httpx.Response(200, json=dict(TRAINING_RUN, status=status)),
    )

    run = getattr(client.training_runs, method_name)("t1")

    assert backend.last().method == "PATCH"
    assert backend.last().path == "/training-runs/t1"
    assert backend.last().body == {"status": status}
    assert run.status == status


def test_log_metric_posts_under_the_training_run(client, backend):
    backend.route(
        "POST", "/training-runs/t1/metrics", httpx.Response(201, json=TRAINING_RUN_METRIC)
    )

    result = client.training_runs.log_metric(
        training_run_id="t1", step=100, metrics={"loss": 0.42}
    )

    assert backend.last().path == "/training-runs/t1/metrics"
    assert backend.last().body == {"step": 100, "metrics": {"loss": 0.42}}
    assert result.id == "m1"
    assert result.step == 100
    assert result.metrics["loss"] == 0.42


def test_log_metric_step_must_be_an_int(client, backend):
    with pytest.raises(SynthGraphValidationError):
        client.training_runs.log_metric(training_run_id="t1", step="100", metrics={"loss": 0.42})  # type: ignore[arg-type]
    assert backend.requests == []


def test_log_metric_rejects_bool_step(client, backend):
    # bool is a subclass of int in Python; guard against it slipping through.
    with pytest.raises(SynthGraphValidationError):
        client.training_runs.log_metric(training_run_id="t1", step=True, metrics={"loss": 0.42})
    assert backend.requests == []


def test_log_metric_metrics_must_be_a_mapping(client, backend):
    with pytest.raises(SynthGraphValidationError):
        client.training_runs.log_metric(training_run_id="t1", step=100, metrics=[("loss", 0.42)])  # type: ignore[arg-type]
    assert backend.requests == []


def test_metrics_are_allowed_to_repeat_a_step(client, backend):
    """No uniqueness constraint on (training_run_id, step) - see CONTRACT.md 2.18."""
    backend.route(
        "POST",
        "/training-runs/t1/metrics",
        lambda request: httpx.Response(201, json=dict(TRAINING_RUN_METRIC, id="m2")),
    )

    client.training_runs.log_metric(training_run_id="t1", step=100, metrics={"loss": 0.4})
    client.training_runs.log_metric(training_run_id="t1", step=100, metrics={"reward": 1.1})

    assert len(backend.requests) == 2


def test_list_metrics(client, backend):
    second_point = dict(TRAINING_RUN_METRIC, id="m2", step=200, metrics={"loss": 0.31})
    backend.route(
        "GET",
        "/training-runs/t1/metrics",
        httpx.Response(200, json=[TRAINING_RUN_METRIC, second_point]),
    )

    points = client.training_runs.metrics(training_run_id="t1")

    assert backend.last().path == "/training-runs/t1/metrics"
    assert [point.id for point in points] == ["m1", "m2"]
    assert [point.step for point in points] == [100, 200]


def test_update_capture_status_patches_the_capture_status_route(client, backend):
    integrations = {"resource_monitor": {"attached": True, "closed": True}}
    backend.route(
        "PATCH",
        "/training-runs/t1/capture-status",
        lambda request: httpx.Response(
            200,
            json=dict(
                TRAINING_RUN,
                capture_status={"status": "complete", "integrations": integrations},
            ),
        ),
    )

    result = client.training_runs.update_capture_status(
        training_run_id="t1", status="complete", integrations=integrations
    )

    assert backend.last().method == "PATCH"
    assert backend.last().path == "/training-runs/t1/capture-status"
    assert backend.last().body == {"status": "complete", "integrations": integrations}
    assert result.id == "t1"


def test_update_capture_status_reads_back_the_returned_value(client, backend):
    backend.route(
        "PATCH",
        "/training-runs/t1/capture-status",
        httpx.Response(
            200,
            json=dict(
                TRAINING_RUN,
                capture_status={
                    "status": "partial",
                    "integrations": {"skrl_writer": {"attached": True, "closed": False}},
                },
            ),
        ),
    )

    result = client.training_runs.update_capture_status(
        training_run_id="t1",
        status="partial",
        integrations={"skrl_writer": {"attached": True, "closed": False}},
    )

    assert result.capture_status == {
        "status": "partial",
        "integrations": {"skrl_writer": {"attached": True, "closed": False}},
    }
