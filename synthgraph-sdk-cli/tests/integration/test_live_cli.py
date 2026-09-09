"""The CLI against a real backend (spec 71)."""

from __future__ import annotations

import json
import subprocess
import sys

import pytest

pytestmark = pytest.mark.integration


def run_cli(*args: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [sys.executable, "-m", "synthgraph.cli.main", *args],
        capture_output=True,
        text=True,
        timeout=120,
    )


def test_whoami_against_the_real_backend(live_client):
    result = run_cli("auth", "whoami", "--json")
    assert result.returncode == 0, result.stderr
    assert json.loads(result.stdout)["id"]


def test_projects_list_against_the_real_backend(live_client, live_project):
    result = run_cli("projects", "list", "--json")
    assert result.returncode == 0, result.stderr
    assert live_project.id in {project["id"] for project in json.loads(result.stdout)}


def test_manifest_export_against_the_real_backend(live_client, live_project, tmp_path):
    experiment = live_client.experiments.create(
        project_id=live_project.id, name="cli-export"
    )
    generation = live_client.generations.create(
        experiment_id=experiment.id,
        name="rain_pass",
        generator="blender",
        parameters={"weather": "rain"},
        seed=1,
    )

    target = tmp_path / "reproduction.json"
    result = run_cli("manifest", generation.id, "--output", str(target))

    assert result.returncode == 0, result.stderr
    json.loads(target.read_text())


def test_unknown_generation_exits_not_found(live_client):
    import uuid

    result = run_cli("generations", "get", str(uuid.uuid4()))
    assert result.returncode == 5
    assert "Error:" in result.stderr
