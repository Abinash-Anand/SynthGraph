from __future__ import annotations

import json

import httpx

from synthgraph.cli.errors import ExitCode

PATH = "/experiments/e1/metric-directions"


def _directions(**declared: str) -> httpx.Response:
    return httpx.Response(200, json={"experimentId": "e1", "directions": declared})


def test_list_shows_declared_directions(run_cli, backend):
    backend.route("GET", PATH, _directions(loss="minimize", accuracy="maximize"))

    result = run_cli("metrics", "list", "e1")

    assert result.exit_code == ExitCode.SUCCESS
    assert "loss" in result.stdout and "minimize" in result.stdout
    assert "accuracy" in result.stdout and "maximize" in result.stdout


def test_list_says_when_nothing_is_declared(run_cli, backend):
    backend.route("GET", PATH, _directions())

    result = run_cli("metrics", "list", "e1")

    assert result.exit_code == ExitCode.SUCCESS
    assert "No metric directions declared" in result.stdout


def test_list_renders_json(run_cli, backend):
    backend.route("GET", PATH, _directions(loss="minimize"))

    result = run_cli("metrics", "list", "e1", "--json")

    assert json.loads(result.stdout) == {
        "experiment_id": "e1",
        "directions": {"loss": "minimize"},
    }


def test_set_direction_declares_one_metric(run_cli, backend):
    backend.route("POST", PATH, _directions(loss="minimize"))

    result = run_cli("metrics", "set-direction", "e1", "loss", "minimize")

    assert result.exit_code == ExitCode.SUCCESS
    assert backend.last().body == {"directions": {"loss": "minimize"}}


def test_set_direction_rejects_an_unknown_direction_without_a_request(run_cli, backend):
    result = run_cli("metrics", "set-direction", "e1", "loss", "lower")

    assert result.exit_code == ExitCode.VALIDATION
    assert "maximize, minimize, neutral" in result.output
    assert backend.requests == []


def test_a_conflict_exits_with_a_validation_code_and_the_backend_message(run_cli, backend):
    backend.route(
        "POST",
        PATH,
        httpx.Response(
            409,
            json={
                "statusCode": 409,
                "code": "metric_direction_conflict",
                "message": (
                    'A different direction is already declared for "loss". Nothing was changed.'
                ),
                "conflicts": [
                    {"metricKey": "loss", "declared": "minimize", "requested": "maximize"}
                ],
            },
        ),
    )

    result = run_cli("metrics", "set-direction", "e1", "loss", "maximize")

    assert result.exit_code == ExitCode.VALIDATION
    assert "Nothing was changed" in result.output


def test_correct_direction_sends_the_note(run_cli, backend):
    backend.route("PUT", PATH, _directions(loss="minimize"))

    result = run_cli(
        "metrics", "correct-direction", "e1", "loss", "minimize", "--note", "was wrong"
    )

    assert result.exit_code == ExitCode.SUCCESS
    assert backend.last().body == {
        "metricKey": "loss",
        "direction": "minimize",
        "correctionNote": "was wrong",
    }


def test_correct_direction_requires_a_note(run_cli, backend):
    result = run_cli("metrics", "correct-direction", "e1", "loss", "minimize")

    assert result.exit_code == ExitCode.USAGE
    assert backend.requests == []
