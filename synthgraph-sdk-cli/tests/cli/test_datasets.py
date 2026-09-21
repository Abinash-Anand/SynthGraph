from __future__ import annotations

import json

import httpx

from synthgraph.cli.errors import ExitCode

from ..conftest import dataset_payload, dataset_version_payload


def test_list_lists_every_dataset(run_cli, backend):
    backend.route("GET", "/datasets", httpx.Response(200, json=[dataset_payload()]))

    result = run_cli("datasets", "list")

    assert backend.last().path == "/datasets"
    assert "rain_v1" in result.stdout


def test_list_with_no_matches_says_so(run_cli, backend):
    backend.route("GET", "/datasets", httpx.Response(200, json=[]))

    result = run_cli("datasets", "list")

    assert result.exit_code == ExitCode.SUCCESS
    assert "No datasets found." in result.stdout


def test_get_renders_a_field_list(run_cli, backend):
    backend.route("GET", "/datasets/d1", httpx.Response(200, json=dataset_payload()))

    result = run_cli("datasets", "get", "d1")

    assert "rain_v1" in result.stdout


def test_get_renders_json(run_cli, backend):
    backend.route("GET", "/datasets/d1", httpx.Response(200, json=dataset_payload()))

    result = run_cli("datasets", "get", "d1", "--json")

    payload = json.loads(result.stdout)
    assert payload["id"] == "d1"
    assert payload["name"] == "rain_v1"


def test_get_requires_a_dataset_id(run_cli):
    assert run_cli("datasets", "get").exit_code == ExitCode.USAGE


def test_versions_lists_recorded_versions(run_cli, backend):
    backend.route(
        "GET",
        "/datasets/d1/versions",
        httpx.Response(200, json=[dataset_version_payload()]),
    )

    result = run_cli("datasets", "versions", "d1")

    assert backend.last().path == "/datasets/d1/versions"
    assert "image" in result.stdout


def test_versions_with_no_matches_says_so(run_cli, backend):
    backend.route("GET", "/datasets/d1/versions", httpx.Response(200, json=[]))

    result = run_cli("datasets", "versions", "d1")

    assert result.exit_code == ExitCode.SUCCESS
    assert "No versions found." in result.stdout


def test_get_version_renders_a_field_list(run_cli, backend):
    backend.route(
        "GET",
        "/dataset-versions/dv1",
        httpx.Response(200, json=dataset_version_payload()),
    )

    result = run_cli("datasets", "get-version", "dv1")

    assert "image" in result.stdout


def test_get_version_renders_json(run_cli, backend):
    backend.route(
        "GET",
        "/dataset-versions/dv1",
        httpx.Response(200, json=dataset_version_payload()),
    )

    result = run_cli("datasets", "get-version", "dv1", "--json")

    payload = json.loads(result.stdout)
    assert payload["id"] == "dv1"
    assert payload["dataset_id"] == "d1"
