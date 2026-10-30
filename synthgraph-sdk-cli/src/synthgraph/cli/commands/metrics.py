"""``synthgraph metrics``: declare what a metric's direction means."""

from __future__ import annotations

import typer

from ..context import CLIContext
from ..interactive import resolve_experiment

app = typer.Typer(
    no_args_is_help=True,
    help="Declare and read the direction (maximize, minimize, neutral) of an experiment's metrics.",
)

_COLUMNS = [("METRIC", "metric"), ("DIRECTION", "direction")]


def _rows(directions: dict[str, str]) -> list[dict[str, str]]:
    return [
        {"metric": key, "direction": direction} for key, direction in sorted(directions.items())
    ]


@app.command("list")
def list_directions(
    ctx: typer.Context,
    experiment: str | None = typer.Argument(None, help="Experiment ID."),
    json_output: bool = typer.Option(False, "--json", help="Print JSON instead of a table."),
) -> None:
    """Show the directions declared so far in an experiment.

    A metric that is not listed has no declared direction; it is not guessed
    from its name.

    Example:

        synthgraph metrics list <experiment-id>
    """
    cli: CLIContext = ctx.obj
    out = cli.output(json_output)
    experiment = resolve_experiment(ctx, experiment)

    declared = cli.client().metric_directions.get(experiment)
    rows = _rows(dict(declared.directions))

    out.emit(
        {"experiment_id": declared.experiment_id, "directions": declared.directions},
        lambda: out.table(rows, _COLUMNS, empty="No metric directions declared."),
    )


@app.command("set-direction")
def set_direction(
    ctx: typer.Context,
    experiment: str = typer.Argument(..., help="Experiment ID."),
    metric: str = typer.Argument(..., help="Metric key, exactly as it is logged."),
    direction: str = typer.Argument(..., help="maximize, minimize or neutral."),
    json_output: bool = typer.Option(False, "--json", help="Print JSON instead of a table."),
) -> None:
    """Declare whether a bigger or smaller value of a metric is better.

    Declaring the same direction again changes nothing. Declaring a different
    one than before is rejected and nothing is changed; use
    ``correct-direction`` to change it on purpose.

    Example:

        synthgraph metrics set-direction <experiment-id> loss minimize
    """
    cli: CLIContext = ctx.obj
    out = cli.output(json_output)

    declared = cli.client().metric_directions.declare(experiment, {metric: direction})
    rows = _rows(dict(declared.directions))

    out.emit(
        {"experiment_id": declared.experiment_id, "directions": declared.directions},
        lambda: out.table(rows, _COLUMNS, empty="No metric directions declared."),
    )


@app.command("correct-direction")
def correct_direction(  # noqa: PLR0917
    ctx: typer.Context,
    experiment: str = typer.Argument(..., help="Experiment ID."),
    metric: str = typer.Argument(..., help="Metric key, exactly as it is logged."),
    direction: str = typer.Argument(..., help="maximize, minimize or neutral."),
    note: str = typer.Option(..., "--note", "-n", help="Why the earlier declaration was wrong."),
    json_output: bool = typer.Option(False, "--json", help="Print JSON instead of a table."),
) -> None:
    """Correct a direction that was declared earlier, recording why.

    Only a metric that already has a declaration can be corrected.

    Example:

        synthgraph metrics correct-direction <experiment-id> loss minimize \
            --note "declared as maximize by mistake"
    """
    cli: CLIContext = ctx.obj
    out = cli.output(json_output)

    declared = cli.client().metric_directions.correct(experiment, metric, direction, note=note)
    rows = _rows(dict(declared.directions))

    out.emit(
        {"experiment_id": declared.experiment_id, "directions": declared.directions},
        lambda: out.table(rows, _COLUMNS, empty="No metric directions declared."),
    )
