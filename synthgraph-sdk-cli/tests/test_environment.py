"""Opt-in code and environment provenance (spec 31, 32)."""

from __future__ import annotations

import json
import subprocess
import sys
import types

import pytest

from synthgraph import environment_metadata, git_metadata, resource_metadata


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


def _remove_psutil(monkeypatch):
    """Force `import psutil` to fail, simulating an environment without it."""
    monkeypatch.setitem(sys.modules, "psutil", None)


def _fake_nvidia_smi(monkeypatch, *, stdout: str = "", returncode: int = 0, raises=None):
    def fake_run(args, **kwargs):
        if raises is not None:
            raise raises
        return subprocess.CompletedProcess(args, returncode, stdout=stdout, stderr="")

    monkeypatch.setattr("synthgraph.environment.subprocess.run", fake_run)


def test_resource_metadata_always_includes_cpu_count(monkeypatch):
    _remove_psutil(monkeypatch)
    _fake_nvidia_smi(monkeypatch, raises=FileNotFoundError())

    metadata = resource_metadata()

    assert isinstance(metadata["cpu_count"], int)
    assert "cpu_percent" not in metadata
    assert "gpu" not in metadata


def test_resource_metadata_uses_psutil_when_available(monkeypatch):
    fake_psutil = types.SimpleNamespace(
        cpu_percent=lambda interval=None: 42.0,
        virtual_memory=lambda: types.SimpleNamespace(
            total=16 * 1024 * 1024 * 1024,
            available=4 * 1024 * 1024 * 1024,
            percent=75.0,
        ),
    )
    monkeypatch.setitem(sys.modules, "psutil", fake_psutil)
    _fake_nvidia_smi(monkeypatch, raises=FileNotFoundError())

    metadata = resource_metadata()

    assert metadata["cpu_percent"] == 42.0
    assert metadata["memory_total_mb"] == 16384.0
    assert metadata["memory_available_mb"] == 4096.0
    assert metadata["memory_percent"] == 75.0


def test_resource_metadata_survives_psutil_raising(monkeypatch):
    def broken_cpu_percent(interval=None):
        raise RuntimeError("psutil blew up on this platform")

    fake_psutil = types.SimpleNamespace(cpu_percent=broken_cpu_percent, virtual_memory=None)
    monkeypatch.setitem(sys.modules, "psutil", fake_psutil)
    _fake_nvidia_smi(monkeypatch, raises=FileNotFoundError())

    metadata = resource_metadata()

    assert "cpu_percent" not in metadata
    assert isinstance(metadata["cpu_count"], int)


def test_resource_metadata_parses_nvidia_smi_csv_output(monkeypatch):
    _remove_psutil(monkeypatch)
    _fake_nvidia_smi(
        monkeypatch,
        stdout="NVIDIA GeForce RTX 3050 Laptop GPU, 4096, 512, 20\n",
    )

    metadata = resource_metadata()

    assert metadata["gpu"] == [
        {
            "name": "NVIDIA GeForce RTX 3050 Laptop GPU",
            "memory_total_mb": 4096,
            "memory_used_mb": 512,
            "utilization_percent": 20,
        }
    ]


def test_resource_metadata_parses_multiple_gpus(monkeypatch):
    _remove_psutil(monkeypatch)
    _fake_nvidia_smi(
        monkeypatch,
        stdout="GPU 0, 8192, 1000, 10\nGPU 1, 8192, 2000, 50\n",
    )

    metadata = resource_metadata()

    assert len(metadata["gpu"]) == 2
    assert metadata["gpu"][0]["name"] == "GPU 0"
    assert metadata["gpu"][1]["utilization_percent"] == 50


def test_resource_metadata_omits_gpu_key_when_nvidia_smi_is_absent(monkeypatch):
    _remove_psutil(monkeypatch)
    _fake_nvidia_smi(monkeypatch, raises=FileNotFoundError())

    assert "gpu" not in resource_metadata()


def test_resource_metadata_omits_gpu_key_on_nonzero_returncode(monkeypatch):
    _remove_psutil(monkeypatch)
    _fake_nvidia_smi(monkeypatch, returncode=1, stdout="")

    assert "gpu" not in resource_metadata()


def test_resource_metadata_is_json_serializable(monkeypatch):
    _remove_psutil(monkeypatch)
    _fake_nvidia_smi(
        monkeypatch,
        stdout="NVIDIA GeForce RTX 3050 Laptop GPU, 4096, 512, 20\n",
    )

    json.dumps(resource_metadata())


def test_resource_metadata_is_never_called_by_auto_capture(monkeypatch):
    """Resource sampling has real cost (a blocking psutil interval, a
    subprocess spawn), so it stays opt-in even though git/environment info
    is now captured by default on generation/training-run creation."""
    from synthgraph.environment import auto_capture

    captured = auto_capture()

    assert "cpu_count" not in captured
    assert "gpu" not in captured
