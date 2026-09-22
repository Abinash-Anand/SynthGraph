"""``synthgraph evaluations`` (spec 24, 47)."""

from __future__ import annotations

import typer

from ..context import CLIContext
from ..interactive import resolve_evaluation, resolve_training_run

app = typer.Typer(
    no_args_is_help=True,
    help="List and inspect evaluation results.",
)

_COLUMNS = [
    ("ID", "id"),
    ("NAME", "name"),
    ("METRICS", "metrics"),
    ("CREATED", "created_at"),
]


@app.command("list")
def list_evaluations(
    ctx: typer.Context,
    training_run: str | None = typer.Option(
        None, "--training-run", "-t", help="Training run ID."
    ),
    json_output: bool = typer.Option(False, "--json", help="Print JSON instead of a table."),
) -> None:
    """List the evaluation results recorded for a training run.

    Omitting ``--training-run`` in an interactive terminal prompts you to
    pick one.

    Example:

        synthgraph evaluations list --training-run <training-run-id>
    """
    cli: CLIContext = ctx.obj
    out = cli.output(json_output)
    training_run = resolve_training_run(ctx, training_run)

    evaluations = cli.client().evaluations.list(training_run_id=training_run)

    rows = [
        {
            "id": evaluation.id,
            "name": evaluation.name,
            "metrics": evaluation.metrics,
            "created_at": evaluation.created_at,
        }
        for evaluation in evaluations
    ]
    payload = [evaluation.to_dict() for evaluation in evaluations]

    out.emit(
        payload,
        lambda: out.table(rows, _COLUMNS, empty="No evaluation results found."),
    )


@app.command("get")
def get_evaluation(
    ctx: typer.Context,
    evaluation_id: str | None = typer.Argument(None, help="Evaluation result ID."),
    json_output: bool = typer.Option(False, "--json", help="Print JSON instead of a field list."),
) -> None:
    """Show one evaluation result.

    Omitting the ID in an interactive terminal prompts you to pick a
    project, then an experiment, then a training run, then an evaluation.

    Example:

        synthgraph evaluations get <evaluation-id>
    """
    cli: CLIContext = ctx.obj
    out = cli.output(json_output)
    evaluation_id = resolve_evaluation(ctx, evaluation_id)

    evaluation = cli.client().evaluations.get(evaluation_id)

    out.emit(
        evaluation.to_dict(),
        lambda: out.fields(
            [
                ("ID", evaluation.id),
                ("Training run", evaluation.training_run_id),
                ("Dataset version", evaluation.dataset_version_id),
                ("Name", evaluation.name),
                ("Metrics", evaluation.metrics),
                ("Created", evaluation.created_at),
                ("Updated", evaluation.updated_at),
                ("Metadata", evaluation.metadata),
            ]
        ),
    )
