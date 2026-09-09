from __future__ import annotations

import json

import httpx

from synthgraph.cli.errors import ExitCode

from ..conftest import experiment_payload


def test_list_requires_a_project(run_cli):
    assert run_cli("experiments", "list").exit_code == ExitCode.USAGE


def test_list_passes_the_project_through(run_cli, backend):
    backend.route(
        "GET", "/projects/p1/experiments", httpx.Response(200, json=[experiment_payload()])
    )

    result = run_cli("experiments", "list", "--project", "p1")

    assert backend.last().path == "/projects/p1/experiments"
    assert "vehicle_detection_rain" in result.stdout


def test_search_uses_the_backend_filter(run_cli, backend):
    backend.route(
        "GET", "/projects/p1/experiments", httpx.Response(200, json=[experiment_payload()])
    )

    run_cli("experiments", "search", "--project", "p1", "rain")

    assert backend.last().query == {"search": "rain"}


def test_search_with_no_matches_says_so(run_cli, backend):
    backend.route("GET", "/projects/p1/experiments", httpx.Response(200, json=[]))

    result = run_cli("experiments", "search", "--project", "p1", "snow")

    assert result.exit_code == ExitCode.SUCCESS
    assert "snow" in result.stdout


def test_get_renders_json(run_cli, backend):
    backend.route("GET", "/experiments/e1", httpx.Response(200, json=experiment_payload()))

    result = run_cli("experiments", "get", "e1", "--json")

    assert json.loads(result.stdout)["project_id"] == "p1"
