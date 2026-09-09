"""``synthgraph manifest`` (spec 50).

Exports a reproduction manifest. It does not regenerate datasets, launch
Blender or Unity, retrain models, or upload anything (spec 59).
"""

from __future__ import annotations

import json
from pathlib import Path

import typer

from ..context import CLIContext

app = typer.Typer()


def manifest(
    ctx: typer.Context,
    generation_id: str = typer.Argument(..., help="Generation ID."),
    output: Path | None = typer.Option(
        None,
        "--output",
        "-o",
        help="Write the manifest to this file instead of stdout.",
    ),
    json_output: bool = typer.Option(
        False,
        "--json",
        help="Accepted for consistency; the manifest is always JSON.",
    ),
) -> None:
    """Export the reproduction manifest for a generation.

    The manifest records what would be needed to reconstruct the experiment.
    It is a record, not a runnable script, and it carries no dataset bytes and
    no credentials.

    Examples:

        synthgraph manifest <generation-id>

        synthgraph manifest <generation-id> --output reproduction.json
    """
    cli: CLIContext = ctx.obj
    out = cli.output(json_output)

    document = cli.client().reproduction.get(generation_id)
    payload = document.to_dict()
    text = json.dumps(payload, indent=2, default=str, ensure_ascii=False)

    if output is None:
        out.json(payload)
        return

    # Any failure here propagates: a failed export must not exit 0 (spec 53).
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(text + "\n", encoding="utf-8")

    out.note(f"Wrote reproduction manifest for {generation_id} to {output}")

    if document.missing:
        out.note(
            f"Note: the backend reported {len(document.missing)} missing "
            "dependency/dependencies. This manifest records provenance; it does not "
            "guarantee reproducibility."
        )
