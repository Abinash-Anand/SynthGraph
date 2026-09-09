from __future__ import annotations

import json

import httpx

from synthgraph.cli.errors import ExitCode

from ..conftest import API_KEY


def test_whoami_shows_the_account(run_cli, backend):
    backend.route(
        "GET", "/auth/me", httpx.Response(200, json={"id": "u1", "email": "researcher@lab.edu"})
    )

    result = run_cli("auth", "whoami")

    assert result.exit_code == ExitCode.SUCCESS
    assert "u1" in result.stdout
    assert "researcher@lab.edu" in result.stdout


def test_whoami_never_prints_the_api_key(run_cli, backend):
    backend.route("GET", "/auth/me", httpx.Response(200, json={"id": "u1", "email": "a@b.c"}))

    result = run_cli("auth", "whoami")

    assert API_KEY not in result.output
    assert "Bearer" not in result.output


def test_whoami_json(run_cli, backend):
    backend.route("GET", "/auth/me", httpx.Response(200, json={"id": "u1", "email": "a@b.c"}))

    payload = json.loads(run_cli("auth", "whoami", "--json").stdout)

    assert payload["id"] == "u1"
    assert "api_key" not in payload


def test_rejected_key_exits_with_the_authentication_code(run_cli, backend):
    backend.route("GET", "/auth/me", httpx.Response(401, json={"message": "Unauthorized"}))

    result = run_cli("auth", "whoami")

    assert result.exit_code == ExitCode.AUTHENTICATION
    assert API_KEY not in result.output


def test_there_is_no_api_key_option(run_cli):
    """Accepting a key on the command line would leak it (spec 57)."""
    result = run_cli("--api-key", "x", "auth", "whoami")
    assert result.exit_code == ExitCode.USAGE
    assert "No such option" in result.output
