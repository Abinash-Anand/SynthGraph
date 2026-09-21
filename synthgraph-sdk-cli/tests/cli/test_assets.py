from __future__ import annotations

import json

import httpx

from synthgraph.cli.errors import ExitCode

from ..conftest import asset_payload, asset_version_payload


def test_list_lists_every_asset(run_cli, backend):
    backend.route("GET", "/assets", httpx.Response(200, json=[asset_payload()]))

    result = run_cli("assets", "list")

    assert backend.last().path == "/assets"
    assert "rain_render" in result.stdout


def test_list_with_no_matches_says_so(run_cli, backend):
    backend.route("GET", "/assets", httpx.Response(200, json=[]))

    result = run_cli("assets", "list")

    assert result.exit_code == ExitCode.SUCCESS
    assert "No assets found." in result.stdout


def test_get_renders_a_field_list(run_cli, backend):
    backend.route("GET", "/assets/a1", httpx.Response(200, json=asset_payload()))

    result = run_cli("assets", "get", "a1")

    assert "rain_render" in result.stdout
    assert "video" in result.stdout


def test_get_renders_json(run_cli, backend):
    backend.route("GET", "/assets/a1", httpx.Response(200, json=asset_payload()))

    result = run_cli("assets", "get", "a1", "--json")

    payload = json.loads(result.stdout)
    assert payload["id"] == "a1"
    assert payload["type"] == "video"


def test_get_requires_an_asset_id(run_cli):
    assert run_cli("assets", "get").exit_code == ExitCode.USAGE


def test_versions_lists_recorded_versions(run_cli, backend):
    backend.route(
        "GET", "/assets/a1/versions", httpx.Response(200, json=[asset_version_payload()])
    )

    result = run_cli("assets", "versions", "a1")

    assert backend.last().path == "/assets/a1/versions"
    assert "rain_render.mp4" in result.stdout


def test_versions_with_no_matches_says_so(run_cli, backend):
    backend.route("GET", "/assets/a1/versions", httpx.Response(200, json=[]))

    result = run_cli("assets", "versions", "a1")

    assert result.exit_code == ExitCode.SUCCESS
    assert "No versions found." in result.stdout


def test_get_version_renders_a_field_list(run_cli, backend):
    backend.route(
        "GET", "/asset-versions/av1", httpx.Response(200, json=asset_version_payload())
    )

    result = run_cli("assets", "get-version", "av1")

    assert "rain_render.mp4" in result.stdout


def test_get_version_renders_json(run_cli, backend):
    backend.route(
        "GET", "/asset-versions/av1", httpx.Response(200, json=asset_version_payload())
    )

    result = run_cli("assets", "get-version", "av1", "--json")

    payload = json.loads(result.stdout)
    assert payload["id"] == "av1"
    assert payload["asset_id"] == "a1"
