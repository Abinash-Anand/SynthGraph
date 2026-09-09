from __future__ import annotations

import json

import httpx

from synthgraph.cli.errors import ExitCode

MARKDOWN = "# Generation g1\n\nGenerated with Blender 4.2.\n"


def _route(backend, status=200):
    backend.route(
        "GET",
        "/generations/g1/documentation",
        httpx.Response(status, text=MARKDOWN, headers={"content-type": "text/markdown"}),
    )


def test_docs_prints_markdown(run_cli, backend):
    _route(backend)

    result = run_cli("docs", "g1")

    assert result.exit_code == ExitCode.SUCCESS
    assert result.stdout == MARKDOWN


def test_docs_writes_a_file(run_cli, backend, tmp_path):
    _route(backend)
    target = tmp_path / "experiment.md"

    result = run_cli("docs", "g1", "--output", str(target))

    assert result.exit_code == ExitCode.SUCCESS
    assert target.read_text() == MARKDOWN
    assert result.stdout == ""


def test_docs_json_wraps_the_markdown(run_cli, backend):
    _route(backend)

    payload = json.loads(run_cli("docs", "g1", "--json").stdout)

    assert payload["generation_id"] == "g1"
    assert payload["documentation"] == MARKDOWN


def test_failed_export_does_not_exit_zero(run_cli, backend, tmp_path):
    _route(backend)
    blocker = tmp_path / "blocker"
    blocker.write_text("not a directory")

    result = run_cli("docs", "g1", "--output", str(blocker / "out.md"))

    assert result.exit_code != ExitCode.SUCCESS


def test_missing_generation_exits_not_found(run_cli, backend):
    backend.route(
        "GET",
        "/generations/nope/documentation",
        httpx.Response(404, json={"message": "Not found"}),
    )
    assert run_cli("docs", "nope").exit_code == ExitCode.NOT_FOUND
