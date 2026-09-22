"""Remembered CLI context: the last project/experiment/training run used.

Purely a convenience for interactive use - never consulted for anything that
affects what gets written to the backend, only for filling in an omitted
lookup argument. Corrupt or unreadable state is treated as empty rather than
raised, since losing a remembered ID is never worse than asking again.
"""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

__all__ = ["CLIState", "state_path"]

_ENV_STATE_PATH = "SYNTHGRAPH_CLI_STATE_PATH"


def state_path() -> Path:
    """Where remembered state lives, overridable for tests via an env var."""
    override = os.environ.get(_ENV_STATE_PATH)
    if override:
        return Path(override)
    return Path.home() / ".synthgraph" / "cli-state.json"


class CLIState:
    """Reads and writes the small JSON file of last-used resource IDs."""

    def __init__(self, path: Path | None = None) -> None:
        self._path = path if path is not None else state_path()

    def get(self, key: str) -> str | None:
        value = self._load().get(key)
        return value if isinstance(value, str) else None

    def set(self, key: str, value: str) -> None:
        data = self._load()
        data[key] = value
        self._save(data)

    def _load(self) -> dict[str, Any]:
        try:
            raw = self._path.read_text(encoding="utf-8")
        except OSError:
            return {}
        try:
            data = json.loads(raw)
        except json.JSONDecodeError:
            return {}
        return data if isinstance(data, dict) else {}

    def _save(self, data: dict[str, Any]) -> None:
        try:
            self._path.parent.mkdir(parents=True, exist_ok=True)
            self._path.write_text(json.dumps(data, indent=2), encoding="utf-8")
        except OSError:
            pass
