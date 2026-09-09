"""Opt-in code and environment provenance (spec 31, 32)."""

from __future__ import annotations

import json
import subprocess

import pytest

from synthgraph import environment_metadata, git_metadata


def _git_available() -> bool:
    try:
        subprocess.run(["git", "--version"], capture_output=True, check=True, timeout=5)
    except (OSError, subprocess.SubprocessError):
        return False
    return True


def test_environment_metadata_is_small_and_fixed():
    metadata = environment_metadata()
    assert set(metadata) == {
        "python_version",
        "python_implementation",
        "os",
        "os_release",
        "machine",
    }


def test_environment_metadata_does_not_enumerate_packages_by_default():
    assert "packages" not in environment_metadata()


def test_named_packages_are_looked_up():
    metadata = environment_metadata(include_packages=["httpx", "definitely-not-installed"])
    assert "httpx" in metadata["packages"]
    assert "definitely-not-installed" not in metadata["packages"]


def test_environment_metadata_is_json_serializable():
    json.dumps(environment_metadata(include_packages=["httpx"]))


def test_git_metadata_is_empty_outside_a_repository(tmp_path):
    assert git_metadata(tmp_path) == {}


def test_git_metadata_on_a_missing_path():
    assert git_metadata("/nonexistent/path/for/tests") == {}


@pytest.mark.skipif(not _git_available(), reason="git is not installed")
def test_git_metadata_reports_commit_branch_and_cleanliness(tmp_path):
    subprocess.run(["git", "init", "-q"], cwd=tmp_path, check=True)
    subprocess.run(["git", "config", "user.email", "t@example.com"], cwd=tmp_path, check=True)
    subprocess.run(["git", "config", "user.name", "Test"], cwd=tmp_path, check=True)
    (tmp_path / "run.py").write_text("print('hello')\n")
    subprocess.run(["git", "add", "."], cwd=tmp_path, check=True)
    subprocess.run(["git", "commit", "-q", "-m", "initial"], cwd=tmp_path, check=True)

    metadata = git_metadata(tmp_path)

    assert len(metadata["commit"]) == 40
    assert metadata["dirty"] is False
    assert "branch" in metadata

    (tmp_path / "run.py").write_text("print('changed')\n")
    assert git_metadata(tmp_path)["dirty"] is True


@pytest.mark.skipif(not _git_available(), reason="git is not installed")
def test_git_metadata_scrubs_remote_credentials(tmp_path):
    subprocess.run(["git", "init", "-q"], cwd=tmp_path, check=True)
    subprocess.run(
        ["git", "remote", "add", "origin", "https://user:ghp_secret@github.com/lab/repo.git"],
        cwd=tmp_path,
        check=True,
    )

    metadata = git_metadata(tmp_path)

    assert metadata["repository"] == "https://github.com/lab/repo.git"
