from __future__ import annotations

import json

import httpx

from synthgraph.cli.errors import ExitCode

from ..conftest import evaluation_payload


def test_list_requires_a_training_run(run_cli):
    assert run_cli("evaluations", "list").exit_code == ExitCode.USAGE


def test_list_passes_the_training_run_through(run_cli, backend):
    backend.route(
        "GET",
        "/training-runs/t1/evaluations",
        httpx.Response(200, json=[evaluation_payload()]),
    )

    result = run_cli("evaluations", "list", "--training-run", "t1")

    assert backend.last().path == "/training-runs/t1/evaluations"
    assert "holdout_map" in result.stdout


def test_list_renders_metrics(run_cli, backend):
    backend.route(
        "GET",
        "/training-runs/t1/evaluations",
        httpx.Response(200, json=[evaluation_payload()]),
    )

    result = run_cli("evaluations", "list", "--training-run", "t1")

    assert "mAP" in result.stdout


def test_list_with_no_matches_says_so(run_cli, backend):
    backend.route(
        "GET", "/training-runs/t1/evaluations", httpx.Response(200, json=[])
    )

    result = run_cli("evaluations", "list", "--training-run", "t1")

    assert result.exit_code == ExitCode.SUCCESS
    assert "No evaluation results found." in result.stdout


def test_list_renders_json(run_cli, backend):
    backend.route(
        "GET",
        "/training-runs/t1/evaluations",
        httpx.Response(200, json=[evaluation_payload()]),
    )

    result = run_cli("evaluations", "list", "--training-run", "t1", "--json")

    payload = json.loads(result.stdout)
    assert payload[0]["id"] == "ev1"
    assert payload[0]["dataset_version_id"] == "dv1"


def test_get_renders_a_field_list(run_cli, backend):
    backend.route(
        "GET", "/evaluation-results/ev1", httpx.Response(200, json=evaluation_payload())
    )

    result = run_cli("evaluations", "get", "ev1")

    assert "holdout_map" in result.stdout
    assert "mAP" in result.stdout


def test_get_renders_json(run_cli, backend):
    backend.route(
        "GET", "/evaluation-results/ev1", httpx.Response(200, json=evaluation_payload())
    )

    result = run_cli("evaluations", "get", "ev1", "--json")

    payload = json.loads(result.stdout)
    assert payload["training_run_id"] == "t1"
    assert payload["dataset_version_id"] == "dv1"
    assert payload["metrics"] == {"mAP": 0.87}


def test_get_requires_an_evaluation_id(run_cli):
    assert run_cli("evaluations", "get").exit_code == ExitCode.USAGE
