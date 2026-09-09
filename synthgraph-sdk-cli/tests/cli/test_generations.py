from __future__ import annotations

import json

import httpx

from synthgraph.cli.errors import ExitCode

from ..conftest import generation_payload


def test_list_renders_a_table(run_cli, backend):
    backend.route(
        "GET", "/experiments/e1/generations", httpx.Response(200, json=[generation_payload()])
    )

    result = run_cli("generations", "list", "--experiment", "e1")

    assert "GENERATOR" in result.stdout
    assert "blender" in result.stdout
    assert "pending" in result.stdout


def test_list_sends_the_parameter_filter(run_cli, backend):
    backend.route(
        "GET", "/experiments/e1/generations", httpx.Response(200, json=[generation_payload()])
    )

    result = run_cli(
        "generations",
        "list",
        "--experiment",
        "e1",
        "--parameters",
        '{"weather":"rain","occlusion":0.3}',
    )

    assert result.exit_code == ExitCode.SUCCESS
    assert json.loads(backend.last().query["parameters"]) == {
        "weather": "rain",
        "occlusion": 0.3,
    }


def test_malformed_parameter_filter_is_a_validation_error(run_cli, backend):
    result = run_cli("generations", "list", "--experiment", "e1", "--parameters", "{oops")

    assert result.exit_code == ExitCode.VALIDATION
    assert "JSON object" in result.stderr
    assert backend.requests == []


def test_non_object_parameter_filter_is_rejected(run_cli, backend):
    result = run_cli("generations", "list", "--experiment", "e1", "--parameters", "[1,2]")

    assert result.exit_code == ExitCode.VALIDATION
    assert backend.requests == []


def test_get_shows_parameters_and_provenance(run_cli, backend):
    backend.route("GET", "/generations/g1", httpx.Response(200, json=generation_payload()))

    result = run_cli("generations", "get", "g1")

    assert "Generator" in result.stdout
    assert "blender" in result.stdout
    assert '"weather": "rain"' in result.stdout
    assert '"seed": 42' in result.stdout


def test_get_json_is_machine_readable(run_cli, backend):
    backend.route("GET", "/generations/g1", httpx.Response(200, json=generation_payload()))

    result = run_cli("generations", "get", "g1", "--json")

    payload = json.loads(result.stdout)
    assert payload["generator"]["name"] == "blender"
    assert payload["reproducibility"]["seed"] == 42
