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

import os
import platform
import subprocess
import sys
import threading
import warnings
from importlib.metadata import PackageNotFoundError, distributions
from importlib.metadata import version as package_version
from pathlib import Path
from typing import Any, Protocol
from urllib.parse import urlsplit, urlunsplit

from .errors import SynthGraphError

__all__ = [
    "ResourceMonitor",
    "auto_capture",
    "environment_metadata",
    "git_metadata",
    "installed_packages_metadata",
    "resource_metadata",
    "scrub_remote_url",
]

_GIT_TIMEOUT_SECONDS = 5
_NVIDIA_SMI_TIMEOUT_SECONDS = 5


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


def resource_metadata() -> dict[str, Any]:
    """Collect a point-in-time snapshot of CPU/memory/GPU resource usage.

    Unlike ``environment_metadata()`` (fixed, effectively-free platform
    facts), this samples live usage and costs on the order of 100ms - the
    CPU percentage needs a short blocking interval to mean anything, and a
    GPU query spawns a subprocess. Call it explicitly at the point a
    resource snapshot is actually wanted (e.g. once per training step or
    epoch); it is never part of ``auto_capture()`` and never called by any
    ``create()`` method.

    Always present: ``cpu_count`` (``os.cpu_count()``, stdlib, no
    dependency). If the optional ``psutil`` package is installed:
    ``cpu_percent``, ``memory_total_mb``, ``memory_available_mb``,
    ``memory_percent``. If ``nvidia-smi`` is on ``PATH``: ``gpu``, a list of
    one dict per GPU with ``name``, ``memory_total_mb``, ``memory_used_mb``,
    ``utilization_percent``. Neither ``psutil`` nor an NVIDIA GPU is
    required - each piece is simply absent from the result when its source
    isn't available, matching ``git_metadata()``'s "never raises" contract.
    """
    metadata: dict[str, Any] = {"cpu_count": os.cpu_count()}
    metadata.update(_psutil_metadata())

    gpus = _nvidia_smi_metadata()
    if gpus:
        metadata["gpu"] = gpus

    return metadata


def _psutil_metadata() -> dict[str, Any]:
    """CPU/memory usage via the optional ``psutil`` dependency, or {} without it."""
    try:
        import psutil  # type: ignore[import-untyped]
    except ImportError:
        return {}

    try:
        memory = psutil.virtual_memory()
        return {
            "cpu_percent": psutil.cpu_percent(interval=0.1),
            "memory_total_mb": round(memory.total / (1024 * 1024), 1),
            "memory_available_mb": round(memory.available / (1024 * 1024), 1),
            "memory_percent": memory.percent,
        }
    except Exception:
        # A resource snapshot must never be the reason a researcher's script
        # crashes - any psutil failure on an unusual platform is silently
        # treated the same as psutil not being installed at all.
        return {}


def _nvidia_smi_metadata() -> list[dict[str, Any]]:
    """Per-GPU utilization via ``nvidia-smi``, or [] when it's unavailable."""
    try:
        result = subprocess.run(
            [
                "nvidia-smi",
                "--query-gpu=name,memory.total,memory.used,utilization.gpu",
                "--format=csv,noheader,nounits",
            ],
            capture_output=True,
            text=True,
            timeout=_NVIDIA_SMI_TIMEOUT_SECONDS,
            check=False,
        )
    except (OSError, subprocess.SubprocessError):
        return []
    if result.returncode != 0 or not result.stdout.strip():
        return []

    gpus: list[dict[str, Any]] = []
    for line in result.stdout.strip().splitlines():
        parts = [part.strip() for part in line.split(",")]
        if len(parts) != 4:
            continue
        name, memory_total, memory_used, utilization = parts
        try:
            gpus.append(
                {
                    "name": name,
                    "memory_total_mb": int(memory_total),
                    "memory_used_mb": int(memory_used),
                    "utilization_percent": int(utilization),
                }
            )
        except ValueError:
            continue
    return gpus


def installed_packages_metadata() -> dict[str, str]:
    """Collect every installed package's name and version.

    Unlike ``environment_metadata()``'s ``include_packages``, which only
    reports the packages the caller names, this enumerates every
    distribution ``importlib.metadata`` can see - the full dependency
    inventory that spec 32/38 deliberately keeps out of automatic capture.
    It is never called by ``auto_capture()`` or by any ``create()`` method;
    call it yourself and decide where the result goes (typically
    ``metadata=`` on a generation or training run), the same as
    ``git_metadata()``/``environment_metadata()`` before this existed.
    """
    packages: dict[str, str] = {}
    for dist in distributions():
        name = dist.metadata["Name"]
        if name:
            packages[name] = dist.version
    return packages


def _package_version(name: str) -> str | None:
    try:
        return package_version(name)
    except PackageNotFoundError:
        return None


def python_executable() -> str:
    """The interpreter running this code."""
    return sys.executable


class _LogsMetrics(Protocol):
    """Structural type for whatever ``ResourceMonitor`` logs to - a
    ``fluent.TrainingHandle`` satisfies this without ``environment.py``
    needing to import ``fluent`` (which imports the resource modules that
    import this module - importing ``fluent`` here would be circular)."""

    def log_metric(self, *, step: int, metrics: dict[str, Any]) -> Any: ...


class ResourceMonitor:
    """Periodically logs ``resource_metadata()`` to a training run in a
    background thread, so CPU/GPU/memory usage over the course of training
    doesn't need a manual call at every point you'd want a sample.

    This is still opt-in, not automatic-by-default: you construct and
    ``start()`` one (or use it as a context manager) explicitly, the same as
    every other capture mechanism in this SDK - the difference from
    ``resource_metadata()`` itself is that *one* explicit action (starting
    the monitor) now produces many samples over time, instead of one call
    producing one sample.

    Modeled on how MLflow's ``SystemMetricsMonitor`` does this (a
    ``threading.Thread(daemon=True)`` plus a ``threading.Event`` for
    responsive shutdown via ``.wait(interval)`` rather than ``time.sleep()``)
    - read directly from MLflow's source, not assumed - rather than
    Weights & Biases' approach, which runs its system monitor in a separate
    compiled process (``wandb-core``, written in Go) communicating over
    gRPC; a background thread is the right fit for a pure-Python SDK with no
    compiled service of its own, and MLflow's default 10-second sampling
    interval (W&B's default is 15 seconds) is what this defaults to as well.

    Unlike ``resource_metadata()``'s one-shot call, a background thread that
    keeps running after a network hiccup needs a decision about whether to
    keep trying or give up - this keeps trying (logs a warning per failed
    sample, never stops the thread on one bad sample), because a training
    run that runs for hours should not silently lose all resource reporting
    for the rest of it over one transient failure. Call ``stop()`` (or exit
    the ``with`` block) when done - it joins the thread and logs one final
    sample first, so the last stretch of training isn't missing data the
    way it would be if the thread were simply abandoned.
    """

    def __init__(self, training: _LogsMetrics, *, interval_seconds: float = 10.0) -> None:
        self._training = training
        self._interval_seconds = interval_seconds
        self._shutdown = threading.Event()
        self._thread: threading.Thread | None = None
        self._step = 0

    def start(self) -> ResourceMonitor:
        """Start sampling in a background thread. No-op if already running."""
        if self._thread is not None:
            return self

        self._shutdown.clear()
        self._thread = threading.Thread(
            target=self._run,
            daemon=True,
            name="SynthGraphResourceMonitor",
        )
        self._thread.start()
        return self

    def stop(self, *, timeout: float | None = None) -> None:
        """Stop sampling, log one final sample, and join the background thread.

        Safe to call even if the monitor was never started, or already
        stopped.
        """
        if self._thread is None:
            return

        self._shutdown.set()
        self._thread.join(timeout=timeout)
        self._thread = None
        self._log_once()

    def _run(self) -> None:
        while not self._shutdown.is_set():
            self._log_once()
            self._shutdown.wait(self._interval_seconds)

    def _log_once(self) -> None:
        try:
            metrics = resource_metadata()
        except Exception as error:  # pragma: no cover - resource_metadata() never raises today
            warnings.warn(
                f"SynthGraph resource sampling failed, skipping this sample: {error}",
                stacklevel=2,
            )
            return

        step = self._step
        self._step += 1
        try:
            self._training.log_metric(step=step, metrics=metrics)
        except SynthGraphError as error:
            warnings.warn(
                f"SynthGraph resource metric logging failed at step {step}: {error}",
                stacklevel=2,
            )

    def __enter__(self) -> ResourceMonitor:
        return self.start()

    def __exit__(self, *exc_info: object) -> None:
        self.stop()
