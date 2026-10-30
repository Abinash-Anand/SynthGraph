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


# -- recorded generation links (ARCH-004) ------------------------------------

_LINK = {
    "trainingRunId": "t1",
    "generationId": "g1",
    "generationName": "rain_pass",
    "experimentId": "e1",
    "createdAt": "2026-01-01T00:00:00Z",
}


def test_link_generation_records_the_link(run_cli, backend):
    backend.route("POST", "/training-runs/t1/generations", httpx.Response(201, json=_LINK))

    result = run_cli("training-runs", "link-generation", "t1", "g1")

    assert result.exit_code == ExitCode.SUCCESS
    assert backend.last().body == {"generationId": "g1"}
    assert "rain_pass" in result.stdout


def test_link_generation_renders_json(run_cli, backend):
    backend.route("POST", "/training-runs/t1/generations", httpx.Response(201, json=_LINK))

    result = run_cli("training-runs", "link-generation", "t1", "g1", "--json")

    assert json.loads(result.stdout)["generation_id"] == "g1"


def test_linking_the_same_pair_again_says_so_and_succeeds(run_cli, backend):
    backend.route(
        "POST",
        "/training-runs/t1/generations",
        httpx.Response(
            409,
            json={"statusCode": 409, "message": "Training run generation reference already exists"},
        ),
    )
    backend.route("GET", "/training-runs/t1/generations", httpx.Response(200, json=[_LINK]))

    result = run_cli("training-runs", "link-generation", "t1", "g1")

    assert result.exit_code == ExitCode.SUCCESS
    assert "Already linked" in result.output


def test_a_generation_of_another_project_is_a_validation_exit_with_the_reason(run_cli, backend):
    backend.route(
        "POST",
        "/training-runs/t1/generations",
        httpx.Response(
            409,
            json={
                "statusCode": 409,
                "code": "cross_project_reference",
                "message": "This generation belongs to a different project from the training run.",
            },
        ),
    )

    result = run_cli("training-runs", "link-generation", "t1", "g9")

    assert result.exit_code == ExitCode.VALIDATION
    assert "different project" in result.output


def test_link_generation_needs_both_ids(run_cli, backend):
    assert run_cli("training-runs", "link-generation", "t1").exit_code == ExitCode.USAGE
    assert backend.requests == []


def test_generations_lists_the_links(run_cli, backend):
    backend.route(
        "GET",
        "/training-runs/t1/generations",
        httpx.Response(
            200, json=[_LINK, {**_LINK, "generationId": "g2", "generationName": "second"}]
        ),
    )

    result = run_cli("training-runs", "generations", "t1")

    assert result.exit_code == ExitCode.SUCCESS
    assert "rain_pass" in result.stdout and "second" in result.stdout


def test_generations_says_when_none_are_recorded(run_cli, backend):
    backend.route("GET", "/training-runs/t1/generations", httpx.Response(200, json=[]))

    result = run_cli("training-runs", "generations", "t1")

    assert "No generations recorded" in result.stdout


def test_get_shows_the_generations_a_run_used(run_cli, backend):
    backend.route(
        "GET",
        "/training-runs/t1",
        httpx.Response(
            200,
            json=training_run_payload(
                generationReferences=[
                    {"generationId": "g1", "generationName": "rain_pass", "experimentId": "e1"}
                ]
            ),
        ),
    )

    result = run_cli("training-runs", "get", "t1", "--json")

    assert json.loads(result.stdout)["generation_references"][0]["generation_name"] == "rain_pass"
