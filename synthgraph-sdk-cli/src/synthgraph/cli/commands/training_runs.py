"""``synthgraph training-runs`` (spec 23, 47)."""

from __future__ import annotations

from typing import Any

import typer

from ..context import CLIContext
from ..interactive import resolve_experiment, resolve_training_run

app = typer.Typer(
    no_args_is_help=True,
    help="List and inspect training runs, including capture-completeness status.",
)

_COLUMNS = [
    ("ID", "id"),
    ("NAME", "name"),
    ("MODEL", "model"),
    ("STATUS", "status"),
    ("CAPTURE", "capture"),
    ("CREATED", "created_at"),
]


def _capture_label(capture_status: dict[str, Any] | None) -> str:
    """A one-word summary of capture_status for table display.

    ``None`` means this training run never reported at all (CONTRACT.md
    2.27) - distinct from a report that found nothing attached, which is
    why this doesn't just collapse both cases into the same label.
    """
    if capture_status is None:
        return "never reported"
    return str(capture_status.get("status", "unknown"))


@app.command("list")
def list_training_runs(
    ctx: typer.Context,
    experiment: str | None = typer.Option(None, "--experiment", "-e", help="Experiment ID."),
    capture_status: str | None = typer.Option(
        None,
        "--capture-status",
        help="Filter by capture completeness: complete, partial or unknown.",
    ),
    json_output: bool = typer.Option(False, "--json", help="Print JSON instead of a table."),
) -> None:
    """List the training runs in an experiment.

    ``--capture-status`` is the audit query this feature exists for: find
    every run where something didn't get fully captured, without digging
    through logs. Omitting ``--experiment`` in an interactive terminal
    prompts you to pick one.

    Examples:

        synthgraph training-runs list --experiment <experiment-id>

        synthgraph training-runs list --experiment <experiment-id> \\
            --capture-status partial
    """
    cli: CLIContext = ctx.obj
    out = cli.output(json_output)
    experiment = resolve_experiment(ctx, experiment)

    training_runs = cli.client().training_runs.list(
        experiment_id=experiment,
        capture_status=capture_status,
    )

    rows = [
        {
            "id": run.id,
            "name": run.name,
            "model": run.model,
            "status": run.status,
            "capture": _capture_label(run.capture_status),
            "created_at": run.created_at,
        }
        for run in training_runs
    ]
    payload = [run.to_dict() for run in training_runs]

    out.emit(
        payload,
        lambda: out.table(rows, _COLUMNS, empty="No training runs found."),
    )


@app.command("get")
def get_training_run(
    ctx: typer.Context,
    training_run_id: str | None = typer.Argument(None, help="Training run ID."),
    json_output: bool = typer.Option(False, "--json", help="Print JSON instead of a field list."),
) -> None:
    """Show one training run: its config, status, capture-completeness
    report and attached datasets.

    Omitting the ID in an interactive terminal prompts you to pick a
    project, then an experiment, then a training run within it.

    Example:

        synthgraph training-runs get <training-run-id>
    """
    cli: CLIContext = ctx.obj
    out = cli.output(json_output)
    training_run_id = resolve_training_run(ctx, training_run_id)

    run = cli.client().training_runs.get(training_run_id)

    out.emit(
        run.to_dict(),
        lambda: out.fields(
            [
                ("ID", run.id),
                ("Experiment", run.experiment_id),
                ("Name", run.name),
                ("Description", run.description),
                ("Model", run.model),
                ("Framework", run.framework),
                ("Framework version", run.framework_version),
                ("Config", run.config),
                ("Status", run.status),
                ("Capture status", run.capture_status),
                (
                    "Datasets",
                    [dataset.model_dump(mode="json") for dataset in run.datasets],
                ),
                ("Started", run.started_at),
                ("Completed", run.completed_at),
                ("Created", run.created_at),
                ("Updated", run.updated_at),
                ("Metadata", run.metadata),
            ]
        ),
    )


@app.command("metrics")
def list_training_run_metrics(
    ctx: typer.Context,
    training_run_id: str | None = typer.Argument(None, help="Training run ID."),
    json_output: bool = typer.Option(False, "--json", help="Print JSON instead of a table."),
) -> None:
    """List the metric points recorded for a training run, ordered by step.

    Omitting the ID in an interactive terminal prompts you to pick one.

    Example:

        synthgraph training-runs metrics <training-run-id>
    """
    cli: CLIContext = ctx.obj
    out = cli.output(json_output)
    training_run_id = resolve_training_run(ctx, training_run_id)

    metric_points = cli.client().training_runs.metrics(training_run_id=training_run_id)

    rows = [
        {
            "step": point.step,
            "metrics": point.metrics,
            "created_at": point.created_at,
        }
        for point in metric_points
    ]
    payload = [point.to_dict() for point in metric_points]

    out.emit(
        payload,
        lambda: out.table(
            rows,
            [("STEP", "step"), ("METRICS", "metrics"), ("CREATED", "created_at")],
            empty="No metrics recorded.",
        ),
    )
