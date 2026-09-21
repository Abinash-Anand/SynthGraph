"""Command registration, help, exit codes and error rendering."""

from __future__ import annotations

import json
import sys

import httpx
import pytest

from synthgraph import __version__
from synthgraph.cli.errors import ExitCode

from ..conftest import project_payload

COMMAND_GROUPS = (
    "auth",
    "projects",
    "experiments",
    "generations",
    "training-runs",
    "compare",
    "manifest",
    "docs",
)


def test_version(run_cli):
    result = run_cli("--version")
    assert result.exit_code == ExitCode.SUCCESS
    assert __version__ in result.stdout


def test_root_help_lists_every_command_group(run_cli):
    result = run_cli("--help")
    assert result.exit_code == ExitCode.SUCCESS
    for command in COMMAND_GROUPS:
        assert command in result.stdout


@pytest.mark.parametrize("group", COMMAND_GROUPS)
def test_every_group_has_help(run_cli, group):
    result = run_cli(group, "--help")
    assert result.exit_code == ExitCode.SUCCESS
    assert result.stdout.strip()


def test_help_documents_arguments_and_examples(run_cli):
    result = run_cli("manifest", "--help")
    assert "--output" in result.stdout
    assert "reproduction.json" in result.stdout


def test_unknown_command_is_a_usage_error(run_cli):
    assert run_cli("nonsense").exit_code == ExitCode.USAGE


def test_missing_required_option_is_a_usage_error(run_cli):
    assert run_cli("experiments", "list").exit_code == ExitCode.USAGE


def test_missing_argument_is_a_usage_error(run_cli):
    assert run_cli("projects", "get").exit_code == ExitCode.USAGE


@pytest.mark.parametrize(
    ("status", "expected"),
    [
        (401, ExitCode.AUTHENTICATION),
        (403, ExitCode.AUTHORIZATION),
        (404, ExitCode.NOT_FOUND),
        (409, ExitCode.VALIDATION),
        (400, ExitCode.VALIDATION),
        (500, ExitCode.TRANSPORT),
    ],
)
def test_backend_errors_map_to_exit_codes(run_cli, backend, status, expected):
    backend.route("GET", "/projects/p1", httpx.Response(status, json={"message": "no"}))
    result = run_cli("projects", "get", "p1")
    assert result.exit_code == expected


def test_error_output_is_short_and_goes_to_stderr(run_cli, backend):
    backend.route("GET", "/projects/p1", httpx.Response(404, json={"message": "Not found"}))

    result = run_cli("projects", "get", "p1")

    assert result.stdout == ""
    assert result.stderr.startswith("Error: ")
    assert len(result.stderr.splitlines()) == 1
    assert "Traceback" not in result.stderr


def test_authentication_error_names_the_environment_variable(run_cli, backend):
    backend.route("GET", "/projects", httpx.Response(401, json={"message": "Unauthorized"}))
    result = run_cli("projects", "list")
    assert "SYNTHGRAPH_API_KEY" in result.stderr


def test_transport_failure_exits_with_the_transport_code(run_cli, backend):
    def explode(_request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("connection refused")

    backend.route("GET", "/projects", explode)

    result = run_cli("projects", "list")

    assert result.exit_code == ExitCode.TRANSPORT
    assert "Error:" in result.stderr


def test_success_exits_zero(run_cli, backend):
    backend.route("GET", "/projects", httpx.Response(200, json=[project_payload()]))
    assert run_cli("projects", "list").exit_code == ExitCode.SUCCESS


def test_global_json_flag_applies_to_subcommands(run_cli, backend):
    backend.route("GET", "/projects", httpx.Response(200, json=[project_payload()]))

    result = run_cli("--json", "projects", "list")

    assert json.loads(result.stdout)[0]["id"] == "p1"


def test_framework_usage_errors_are_recognized_by_shape(capsys):
    """Typer vendors its own Click exception classes in newer releases.

    The handler must key off the exception's shape, not its class, so exit
    codes stay correct across the Typer versions this package supports.
    """
    from synthgraph.cli.main import _handle

    class VendoredUsageError(Exception):
        exit_code = 2

        def show(self) -> None:
            print("Usage: synthgraph ...", file=sys.stderr)

    assert _handle(VendoredUsageError()) == ExitCode.USAGE
    assert "Usage:" in capsys.readouterr().err


def test_framework_exit_is_passed_through():
    from synthgraph.cli.main import _handle

    class VendoredExit(Exception):
        exit_code = 0

    assert _handle(VendoredExit()) == ExitCode.SUCCESS


def test_bare_invocation_shows_help(run_cli):
    result = run_cli()
    assert "Usage" in result.output
