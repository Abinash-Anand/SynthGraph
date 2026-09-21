"""Provenance helpers for code and environment metadata (spec 31, 32).

``git_metadata()`` and ``environment_metadata()`` are safe to call on every
generation/training run by default: they never read repository contents,
diffs, file lists, the full environment, installed-package inventories,
environment variables, user names, host names, or anything else that could
carry a secret. ``auto_capture()`` composes the two for the call sites in
``generations.py``/``training.py`` that capture this by default unless the
caller opts out with ``capture_environment=False``.

Deliberately not collected, even automatically: anything beyond the fixed,
fixed-size fact set each function documents below.
"""

from __future__ import annotations

import platform
import subprocess
import sys
from importlib.metadata import PackageNotFoundError
from importlib.metadata import version as package_version
from pathlib import Path
from typing import Any
from urllib.parse import urlsplit, urlunsplit

__all__ = ["auto_capture", "environment_metadata", "git_metadata", "scrub_remote_url"]

_GIT_TIMEOUT_SECONDS = 5


def scrub_remote_url(url: str) -> str:
    """Strip any embedded credentials from a Git remote URL.

    ``https://user:token@github.com/lab/repo.git`` must never reach the
    backend with the token attached.
    """
    if "@" not in url:
        return url
    if "://" not in url:
        # scp-style remote such as git@github.com:lab/repo.git - no secret.
        return url
    parts = urlsplit(url)
    if not parts.netloc or "@" not in parts.netloc:
        return url
    host = parts.netloc.rsplit("@", 1)[1]
    return urlunsplit((parts.scheme, host, parts.path, parts.query, parts.fragment))


def _git(args: list[str], cwd: Path) -> str | None:
    """Run a git command, returning None if git or the repository is absent."""
    try:
        result = subprocess.run(
            ["git", *args],
            cwd=str(cwd),
            capture_output=True,
            text=True,
            timeout=_GIT_TIMEOUT_SECONDS,
            check=False,
        )
    except (OSError, subprocess.SubprocessError):
        return None
    if result.returncode != 0:
        return None
    # An empty string is a real answer (a clean working tree); only a failure
    # is reported as None.
    return result.stdout.strip()


def git_metadata(path: str | Path | None = None) -> dict[str, Any]:
    """Collect Git provenance for the working directory, if there is any.

    Returns an empty mapping when the directory is not a Git repository or Git
    is not installed - never raises, so adding this to a capture call cannot
    break a researcher's script.

    Keys, when available: ``commit``, ``branch``, ``repository``, ``dirty``.
    """
    cwd = Path(path) if path is not None else Path.cwd()
    if not cwd.exists():
        return {}

    if _git(["rev-parse", "--is-inside-work-tree"], cwd) != "true":
        return {}

    metadata: dict[str, Any] = {}

    commit = _git(["rev-parse", "HEAD"], cwd)
    if commit:
        metadata["commit"] = commit

    branch = _git(["rev-parse", "--abbrev-ref", "HEAD"], cwd)
    if branch and branch != "HEAD":
        metadata["branch"] = branch

    remote = _git(["config", "--get", "remote.origin.url"], cwd)
    if remote:
        metadata["repository"] = scrub_remote_url(remote)

    status = _git(["status", "--porcelain"], cwd)
    if status is not None:
        metadata["dirty"] = bool(status)

    return metadata


def environment_metadata(include_packages: list[str] | None = None) -> dict[str, Any]:
    """Collect a small, fixed set of reproducibility-relevant runtime facts.

    Always: Python version and implementation, OS name and release, machine
    architecture.

    ``include_packages`` optionally adds the installed version of packages the
    researcher names explicitly, e.g. ``["torch", "numpy"]``. The SDK never
    enumerates the whole environment on its own (spec 32, 38).
    """
    metadata: dict[str, Any] = {
        "python_version": platform.python_version(),
        "python_implementation": platform.python_implementation(),
        "os": platform.system(),
        "os_release": platform.release(),
        "machine": platform.machine(),
    }

    if include_packages:
        packages: dict[str, str] = {}
        for name in include_packages:
            version = _package_version(name)
            if version is not None:
                packages[name] = version
        if packages:
            metadata["packages"] = packages

    return metadata


def auto_capture() -> dict[str, Any]:
    """Compose ``environment_metadata()`` and ``git_metadata()`` for a call site
    that captures both by default.

    Called fresh on every invocation rather than cached: a generation's Git
    ``dirty`` flag is meaningful precisely because it can change between two
    calls in the same process, and caching it would silently misreport that.
    The keys the two functions produce never collide, so this is a plain
    merge, not a policy decision about precedence.
    """
    return {**environment_metadata(), **git_metadata()}


def _package_version(name: str) -> str | None:
    try:
        return package_version(name)
    except PackageNotFoundError:
        return None


def python_executable() -> str:
    """The interpreter running this code."""
    return sys.executable
