"""``synthgraph compare`` (spec 49).

The backend computes the comparison. This command presents it. Presentation may
change how a difference *looks*; it never changes what the difference *is*.
"""

from __future__ import annotations

import json
from collections.abc import Mapping
from typing import Any

import typer

from ..context import CLIContext
from ..output import Output

app = typer.Typer()


def compare(
    ctx: typer.Context,
    generation_ids: list[str] = typer.Argument(
        ...,
        help="Two or more generation IDs to compare.",
        metavar="GENERATION_ID GENERATION_ID...",
    ),
    json_output: bool = typer.Option(False, "--json", help="Print the raw comparison JSON."),
) -> None:
    """Compare two or more generation runs.

    Example:

        synthgraph compare <generation-id-a> <generation-id-b>
    """
    cli: CLIContext = ctx.obj
    out = cli.output(json_output)

    result = cli.client().comparisons.compare(list(generation_ids))
    payload = result.to_dict()

    out.emit(payload, lambda: _render(out, payload))


def _render(out: Output, payload: Mapping[str, Any]) -> None:
    """Render whatever the backend returned, without inventing structure."""
    ids = payload.get("generation_ids") or payload.get("generationIds")
    if isinstance(ids, list):
        for index, generation_id in enumerate(ids):
            out.line(f"Generation {_label(index)}: {generation_id}")
        out.line()

    differences = payload.get("differences")
    rendered_any = False

    if isinstance(differences, Mapping):
        for section, content in differences.items():
            out.line(_titlecase(section))
            _render_section(out, content, ids if isinstance(ids, list) else [])
            out.line()
            rendered_any = True
    elif isinstance(differences, list) and differences:
        out.line("Differences")
        for item in differences:
            out.line(f"  {_format_inline(item)}")
        out.line()
        rendered_any = True

    summary = payload.get("summary")
    if summary:
        out.line("Summary")
        out.fields([("", summary)] if not isinstance(summary, Mapping) else list(summary.items()))
        rendered_any = True

    if not rendered_any:
        # No recognized difference structure: show the payload rather than
        # claiming the generations are identical.
        remaining = {
            key: value
            for key, value in payload.items()
            if key not in {"generation_ids", "generationIds"}
        }
        if remaining:
            out.fields(list(remaining.items()))
        else:
            out.line("The backend reported no differences.")


def _render_section(out: Output, content: Any, ids: list[str]) -> None:
    """Render one section of the difference map."""
    if isinstance(content, Mapping):
        for key, value in content.items():
            if isinstance(value, Mapping):
                parts = [f"{label}: {_format_inline(item)}" for label, item in value.items()]
                out.line(f"  {key}: " + "  ".join(parts))
            elif isinstance(value, list) and ids and len(value) == len(ids):
                parts = [
                    f"{_label(index)}: {_format_inline(item)}"
                    for index, item in enumerate(value)
                ]
                out.line(f"  {key}: " + "  ".join(parts))
            else:
                out.line(f"  {key}: {_format_inline(value)}")
    elif isinstance(content, list):
        for item in content:
            out.line(f"  {_format_inline(item)}")
    else:
        out.line(f"  {_format_inline(content)}")


def _format_inline(value: Any) -> str:
    if isinstance(value, str):
        return value
    if value is None:
        return "-"
    if isinstance(value, (Mapping, list, tuple)):
        return json.dumps(value, default=str, ensure_ascii=False)
    return str(value)


def _label(index: int) -> str:
    """A, B, C ... then plain numbers past Z."""
    return chr(ord("A") + index) if index < 26 else str(index + 1)


def _titlecase(text: str) -> str:
    return text.replace("_", " ").capitalize()
