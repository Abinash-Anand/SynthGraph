"""Packaging and public-surface checks."""

from __future__ import annotations

import importlib
import subprocess
import sys

import pytest

import synthgraph


def test_version_is_exposed():
    assert synthgraph.__version__ == "0.3.1"


def test_public_surface_is_importable():
    for name in synthgraph.__all__:
        assert hasattr(synthgraph, name), name


def test_all_is_sorted_and_unique():
    assert synthgraph.__all__ == sorted(set(synthgraph.__all__))


def test_backwards_compatible_names_still_exist():
    """v0.1.0 code must keep importing."""
    from synthgraph import (  # noqa: F401
        AssetReference,
        DataReference,
        DatasetReference,
        Experiment,
        GenerationRun,
        GenerationStatus,
        Generator,
        Project,
        ProjectsAPI,
        Reproducibility,
        SynthGraphClient,
        SynthGraphConfig,
        SynthGraphHTTPClient,
        SynthGraphHTTPError,
    )


def test_http_error_is_still_the_catchable_base():
    from synthgraph import SynthGraphHTTPError
    from synthgraph.errors import SynthGraphNotFoundError

    assert issubclass(SynthGraphNotFoundError, SynthGraphHTTPError)


def test_core_does_not_import_research_tooling():
    """Platform independence: no Blender, Unity, PyTorch, W&B, cloud SDKs (spec 7.1)."""
    forbidden = {
        "bpy",
        "torch",
        "tensorflow",
        "wandb",
        "boto3",
        "unity",
        "numpy",
        "pandas",
    }
    loaded_before = set(sys.modules)

    for module in [
        "synthgraph",
        "synthgraph.client",
        "synthgraph.generations",
        "synthgraph.models",
        "synthgraph.cli.main",
    ]:
        importlib.import_module(module)

    newly_loaded = set(sys.modules) - loaded_before
    assert not (forbidden & {name.split(".")[0] for name in newly_loaded})


def test_every_module_imports_cleanly():
    for module in [
        "synthgraph.auth",
        "synthgraph.client",
        "synthgraph.cli.main",
        "synthgraph.cli.output",
        "synthgraph.comparison",
        "synthgraph.config",
        "synthgraph.datasets",
        "synthgraph.documentation",
        "synthgraph.environment",
        "synthgraph.errors",
        "synthgraph.evaluation",
        "synthgraph.experiments",
        "synthgraph.fluent",
        "synthgraph.generations",
        "synthgraph.http",
        "synthgraph.projects",
        "synthgraph.reproduction",
        "synthgraph.routes",
        "synthgraph.serialization",
        "synthgraph.training",
    ]:
        importlib.import_module(module)


def test_console_script_is_installed():
    result = subprocess.run(
        [sys.executable, "-m", "synthgraph.cli.main", "--version"],
        capture_output=True,
        text=True,
        timeout=60,
    )
    assert result.returncode == 0
    assert "synthgraph" in result.stdout


def test_cli_help_works_without_credentials(monkeypatch):
    """--help must not require an API key."""
    monkeypatch.delenv("SYNTHGRAPH_API_KEY", raising=False)
    from synthgraph.cli.main import run

    assert run(["--help"]) == 0


def test_cli_without_credentials_fails_usefully(monkeypatch, capsys):
    monkeypatch.delenv("SYNTHGRAPH_API_KEY", raising=False)
    from synthgraph.cli.main import run

    code = run(["projects", "list"])

    assert code != 0
    assert "SYNTHGRAPH_API_KEY" in capsys.readouterr().err


@pytest.mark.parametrize("route", ["auth_me", "projects", "generations_compare"])
def test_routes_are_absolute(route):
    from synthgraph.routes import Routes

    assert getattr(Routes, route)().startswith("/")


def test_unverified_routes_are_declared():
    """The spec requires unverified routes to be visible, not silently frozen.

    The set is allowed to be empty - it means every route the spec once left
    open (e.g. the asset-reference route, CONTRACT.md 2.18) has since been
    verified against the backend and moved to the verified section.
    """
    from synthgraph.routes import UNVERIFIED_ROUTES, Routes

    assert isinstance(UNVERIFIED_ROUTES, frozenset)
    for name in UNVERIFIED_ROUTES:
        assert hasattr(Routes, name)
