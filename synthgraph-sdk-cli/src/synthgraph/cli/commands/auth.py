"""``synthgraph auth`` (spec 45)."""

from __future__ import annotations

import typer

from ..context import CLIContext

app = typer.Typer(
    no_args_is_help=True,
    help="Inspect the identity behind the configured API key.",
)


@app.command("whoami")
def whoami(
    ctx: typer.Context,
    json_output: bool = typer.Option(False, "--json", help="Print JSON instead of a table."),
) -> None:
    """Show which SynthGraph account the current API key belongs to.

    The key itself is never printed.

    Example:

        synthgraph auth whoami
    """
    cli: CLIContext = ctx.obj
    out = cli.output(json_output)

    user = cli.client().auth.me()

    out.emit(
        user.to_dict(),
        lambda: out.fields(
            [
                ("ID", user.id),
                ("Email", user.email),
                ("Name", user.name),
            ]
        ),
    )
