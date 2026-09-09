from __future__ import annotations

import json

import httpx

from synthgraph.cli.errors import ExitCode

MANIFEST = {
    "generation_id": "g1",
    "experiment_id": "e1",
    "generator": {"name": "blender", "version": "4.2"},
    "parameters": {"weather": "rain"},
    "reproducibility": {"seed": 42},
    "missing": [],
}


def _route(backend, payload=None, status=200):
    backend.route(
        "GET",
        "/generations/g1/reproduction-manifest",
        httpx.Response(status, json=payload if payload is not None else MANIFEST),
    )


def test_manifest_prints_json_to_stdout(run_cli, backend):
    _route(backend)

    result = run_cli("manifest", "g1")

    assert result.exit_code == ExitCode.SUCCESS
    assert json.loads(result.stdout) == MANIFEST


def test_manifest_writes_a_file(run_cli, backend, tmp_path):
    _route(backend)
    target = tmp_path / "reproduction.json"

    result = run_cli("manifest", "g1", "--output", str(target))

    assert result.exit_code == ExitCode.SUCCESS
    assert json.loads(target.read_text()) == MANIFEST
    assert result.stdout == ""
    assert str(target) in result.stderr


def test_manifest_creates_missing_directories(run_cli, backend, tmp_path):
    _route(backend)
    target = tmp_path / "exports" / "runs" / "reproduction.json"

    assert run_cli("manifest", "g1", "-o", str(target)).exit_code == ExitCode.SUCCESS
    assert target.exists()


def test_manifest_export_is_verbatim(run_cli, backend, tmp_path):
    payload = dict(MANIFEST, backend_only_section={"pipeline": "v3"})
    _route(backend, payload)
    target = tmp_path / "reproduction.json"

    run_cli("manifest", "g1", "--output", str(target))

    assert json.loads(target.read_text()) == payload


def test_failed_export_does_not_exit_zero(run_cli, backend, tmp_path):
    """Never report success for an export that did not happen (spec 53)."""
    _route(backend)
    blocker = tmp_path / "blocker"
    blocker.write_text("not a directory")

    result = run_cli("manifest", "g1", "--output", str(blocker / "out.json"))

    assert result.exit_code != ExitCode.SUCCESS
    assert "Error:" in result.stderr


def test_missing_generation_exits_not_found(run_cli, backend):
    _route(backend, {"message": "Generation not found"}, status=404)

    result = run_cli("manifest", "nope")

    assert result.exit_code == ExitCode.NOT_FOUND


def test_incomplete_manifest_is_flagged_without_failing(run_cli, backend, tmp_path):
    _route(backend, dict(MANIFEST, missing=[{"kind": "asset", "id": "car.blend"}]))
    target = tmp_path / "reproduction.json"

    result = run_cli("manifest", "g1", "--output", str(target))

    assert result.exit_code == ExitCode.SUCCESS
    assert "does not guarantee reproducibility" in result.stderr


def test_manifest_never_runs_external_tooling(run_cli, backend):
    """The manifest is an export, not an execution (spec 50, 59)."""
    _route(backend)

    run_cli("manifest", "g1")

    assert [(r.method, r.path) for r in backend.requests] == [
        ("GET", "/generations/g1/reproduction-manifest")
    ]
