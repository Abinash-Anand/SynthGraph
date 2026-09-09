from __future__ import annotations

import json

import httpx

from synthgraph.cli.errors import ExitCode

from ..conftest import project_payload


def test_list_renders_a_table(run_cli, backend):
    backend.route(
        "GET",
        "/projects",
        httpx.Response(200, json=[project_payload(), project_payload(id="p2", name="Snow")]),
    )

    result = run_cli("projects", "list")

    assert result.exit_code == ExitCode.SUCCESS
    assert "ID" in result.stdout and "NAME" in result.stdout
    assert "p1" in result.stdout and "Snow" in result.stdout


def test_list_json_is_pure_json(run_cli, backend):
    backend.route("GET", "/projects", httpx.Response(200, json=[project_payload()]))

    result = run_cli("projects", "list", "--json")

    payload = json.loads(result.stdout)
    assert payload[0]["name"] == "Rain research"


def test_empty_list_is_reported_not_faked(run_cli, backend):
    backend.route("GET", "/projects", httpx.Response(200, json=[]))

    result = run_cli("projects", "list")

    assert result.exit_code == ExitCode.SUCCESS
    assert "No projects" in result.stdout


def test_empty_list_json_is_an_empty_array(run_cli, backend):
    backend.route("GET", "/projects", httpx.Response(200, json=[]))
    assert json.loads(run_cli("projects", "list", "--json").stdout) == []


def test_get_renders_fields(run_cli, backend):
    backend.route("GET", "/projects/p1", httpx.Response(200, json=project_payload()))

    result = run_cli("projects", "get", "p1")

    assert "Rain research" in result.stdout
    assert "Adverse weather detection" in result.stdout


def test_get_reaches_the_right_route(run_cli, backend):
    backend.route("GET", "/projects/p1", httpx.Response(200, json=project_payload()))
    run_cli("projects", "get", "p1")
    assert backend.last().path == "/projects/p1"
