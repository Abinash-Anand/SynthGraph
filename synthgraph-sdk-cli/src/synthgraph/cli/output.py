"""CLI rendering (spec 52).

Two modes, applied identically by every command:

* human - aligned tables and key/value blocks
* ``--json`` - the payload only, no decorative text, safe to pipe

Nested structures are printed as indented JSON rather than flattened, because a
generation's parameters are the point of the record.
"""

from __future__ import annotations

import json
import sys
from collections.abc import Callable, Mapping, Sequence
from datetime import date, datetime
from typing import Any, TextIO

__all__ = ["Output", "format_value"]

_MAX_CELL = 48


def _default(value: Any) -> Any:
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    return str(value)


def format_value(value: Any, *, indent: int = 2) -> str:
    """Render a value for human output."""
    if value is None:
        return "-"
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, str):
        return value
    if isinstance(value, (Mapping, list, tuple)):
        if not value:
            return "-"
        return json.dumps(value, indent=indent, default=_default, ensure_ascii=False)
    return str(value)


def _truncate(text: str) -> str:
    single_line = text.replace("\n", " ")
    if len(single_line) <= _MAX_CELL:
        return single_line
    return single_line[: _MAX_CELL - 1] + "…"


class Output:
    """Writes command results in the mode the user asked for."""

    def __init__(
        self,
        *,
        json_mode: bool = False,
        stream: TextIO | None = None,
        error_stream: TextIO | None = None,
    ) -> None:
        self.json_mode = json_mode
        self._stream = stream if stream is not None else sys.stdout
        self._error_stream = error_stream if error_stream is not None else sys.stderr

    # -- primitives --------------------------------------------------------

    def line(self, text: str = "") -> None:
        """Write one line of human output. Suppressed in JSON mode."""
        if not self.json_mode:
            print(text, file=self._stream)

    def note(self, text: str) -> None:
        """Write an informational message to stderr, so stdout stays pipeable."""
        print(text, file=self._error_stream)

    def error(self, text: str) -> None:
        """Write an error message to stderr."""
        print(f"Error: {text}", file=self._error_stream)

    def json(self, data: Any) -> None:
        """Write JSON to stdout regardless of mode."""
        print(json.dumps(data, indent=2, default=_default, ensure_ascii=False), file=self._stream)

    def raw(self, text: str) -> None:
        """Write text verbatim, with no trailing newline added twice."""
        self._stream.write(text)
        if not text.endswith("\n"):
            self._stream.write("\n")

    # -- structured results ------------------------------------------------

    def emit(self, data: Any, render: Callable[[], None]) -> None:
        """Emit ``data`` as JSON, or call ``render`` for human output."""
        if self.json_mode:
            self.json(data)
        else:
            render()

    def table(
        self,
        rows: Sequence[Mapping[str, Any]],
        columns: Sequence[tuple[str, str]],
        *,
        empty: str = "No results.",
    ) -> None:
        """Print an aligned table. ``columns`` is a sequence of (header, key)."""
        if not rows:
            self.line(empty)
            return

        headers = [header for header, _ in columns]
        cells = [
            [_truncate(format_value(row.get(key))) for _, key in columns] for row in rows
        ]

        widths = [len(header) for header in headers]
        for line in cells:
            for index, cell in enumerate(line):
                widths[index] = max(widths[index], len(cell))

        self.line("  ".join(header.ljust(widths[i]) for i, header in enumerate(headers)).rstrip())
        self.line("  ".join("-" * width for width in widths))
        for line in cells:
            self.line("  ".join(cell.ljust(widths[i]) for i, cell in enumerate(line)).rstrip())

    def fields(self, pairs: Sequence[tuple[str, Any]]) -> None:
        """Print a key/value block, indenting multi-line values under their key."""
        if not pairs:
            return
        width = max(len(label) for label, _ in pairs)
        for label, value in pairs:
            rendered = format_value(value)
            if "\n" in rendered:
                self.line(f"{label}:")
                for line in rendered.splitlines():
                    self.line(f"  {line}")
            else:
                self.line(f"{label.ljust(width)}  {rendered}")
