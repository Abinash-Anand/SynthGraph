"""``synthgraph docs`` (spec 51)."""

from __future__ import annotations

from pathlib import Path

import typer

from ..context import CLIContext

app = typer.Typer()


def docs(
    ctx: typer.Context,
    generation_id: str = typer.Argument(..., help="Generation ID."),
    output: Path | None = typer.Option(
        None,
        "--output",
        "-o",
        help="Write the Markdown to this file instead of stdout.",
    ),
    json_output: bool = typer.Option(
        False,
        "--json",
        help="Wrap the Markdown in a JSON object for scripting.",
    ),
) -> None:
    """Export backend-generated Markdown documentation for a generation.

    Useful for paper supplements, lab records and experiment handover.

    Examples:

        synthgraph docs <generation-id>

        synthgraph docs <generation-id> --output experiment.md
    """
    cli: CLIContext = ctx.obj
    out = cli.output(json_output)

    markdown = cli.client().documentation.get(generation_id)

    if output is not None:
        # Any failure here propagates: a failed export must not exit 0.
        output.parent.mkdir(parents=True, exist_ok=True)
        text = markdown if markdown.endswith("\n") else markdown + "\n"
        output.write_text(text, encoding="utf-8")
        out.note(f"Wrote documentation for {generation_id} to {output}")
        return

    if out.json_mode:
        out.json({"generation_id": generation_id, "documentation": markdown})
    else:
        out.raw(markdown)
