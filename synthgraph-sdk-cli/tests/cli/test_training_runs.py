from __future__ import annotations

import json

import httpx

from synthgraph.cli.errors import ExitCode

from ..conftest import training_run_metric_payload, training_run_payload


def test_list_requires_an_experiment(run_cli):
    assert run_cli("training-runs", "list").exit_code == ExitCode.USAGE


def test_list_passes_the_experiment_through(run_cli, backend):
    backend.route(
        "GET",
        "/experiments/e1/training-runs",
        httpx.Response(200, json=[training_run_payload()]),
    )

    result = run_cli("training-runs", "list", "--experiment", "e1")

    assert backend.last().path == "/experiments/e1/training-runs"
    assert "yolo_run_1" in result.stdout


def test_list_renders_the_model_from_trainer(run_cli, backend):
    backend.route(
        "GET",
        "/experiments/e1/training-runs",
        httpx.Response(200, json=[training_run_payload()]),
    )

    result = run_cli("training-runs", "list", "--experiment", "e1")

    assert "yolo" in result.stdout


def test_list_shows_never_reported_when_capture_status_is_null(run_cli, backend):
    backend.route(
        "GET",
        "/experiments/e1/training-runs",
        httpx.Response(200, json=[training_run_payload(capture_status=None)]),
    )

    result = run_cli("training-runs", "list", "--experiment", "e1")

    assert "never reported" in result.stdout


def test_list_shows_the_capture_status_value_when_reported(run_cli, backend):
    backend.route(
        "GET",
        "/experiments/e1/training-runs",
        httpx.Response(
            200,
            json=[
                training_run_payload(
                    capture_status={"status": "partial", "integrations": {}}
                )
            ],
        ),
    )

    result = run_cli("training-runs", "list", "--experiment", "e1")

    assert "partial" in result.stdout


def test_list_sends_the_capture_status_filter(run_cli, backend):
    backend.route(
        "GET", "/experiments/e1/training-runs", httpx.Response(200, json=[])
    )

    run_cli("training-runs", "list", "--experiment", "e1", "--capture-status", "partial")

    assert backend.last().query == {"captureStatus": "partial"}


def test_list_rejects_an_invalid_capture_status(run_cli, backend):
    result = run_cli(
        "training-runs", "list", "--experiment", "e1", "--capture-status", "bogus"
    )

    assert result.exit_code == ExitCode.VALIDATION


def test_list_with_no_matches_says_so(run_cli, backend):
    backend.route(
        "GET", "/experiments/e1/training-runs", httpx.Response(200, json=[])
    )

    result = run_cli("training-runs", "list", "--experiment", "e1")

    assert result.exit_code == ExitCode.SUCCESS
    assert "No training runs found." in result.stdout


def test_get_renders_a_field_list(run_cli, backend):
    backend.route(
        "GET", "/training-runs/t1", httpx.Response(200, json=training_run_payload())
    )

    result = run_cli("training-runs", "get", "t1")

    assert "yolo" in result.stdout
    assert "pytorch" in result.stdout


def test_get_renders_json(run_cli, backend):
    backend.route(
        "GET", "/training-runs/t1", httpx.Response(200, json=training_run_payload())
    )

    result = run_cli("training-runs", "get", "t1", "--json")

    payload = json.loads(result.stdout)
    assert payload["experiment_id"] == "e1"
    assert payload["model"] == "yolo"
    assert payload["framework"] == "pytorch"
    assert payload["config"] == {"epochs": 50}


def test_get_requires_a_training_run_id(run_cli):
    assert run_cli("training-runs", "get").exit_code == ExitCode.USAGE


def test_metrics_lists_recorded_points(run_cli, backend):
    backend.route(
        "GET",
        "/training-runs/t1/metrics",
        httpx.Response(200, json=[training_run_metric_payload()]),
    )

    result = run_cli("training-runs", "metrics", "t1")

    assert backend.last().path == "/training-runs/t1/metrics"
    assert "loss" in result.stdout


def test_metrics_renders_json(run_cli, backend):
    backend.route(
        "GET",
        "/training-runs/t1/metrics",
        httpx.Response(200, json=[training_run_metric_payload()]),
    )

    result = run_cli("training-runs", "metrics", "t1", "--json")

    payload = json.loads(result.stdout)
    assert payload[0]["step"] == 100
    assert payload[0]["metrics"] == {"loss": 0.42}


def test_metrics_with_no_points_says_so(run_cli, backend):
    backend.route(
        "GET", "/training-runs/t1/metrics", httpx.Response(200, json=[])
    )

    result = run_cli("training-runs", "metrics", "t1")

    assert result.exit_code == ExitCode.SUCCESS
    assert "No metrics recorded." in result.stdout
