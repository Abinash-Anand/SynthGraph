"""``synthgraph experiments`` (spec 47)."""

from __future__ import annotations

import typer

from ..context import CLIContext

app = typer.Typer(
    no_args_is_help=True,
    help="List, search and inspect experiments.",
)

_COLUMNS = [("ID", "id"), ("NAME", "name"), ("CREATED", "created_at")]


@app.command("list")
def list_experiments(
    ctx: typer.Context,
    project: str = typer.Option(..., "--project", "-p", help="Project ID."),
    search: str | None = typer.Option(None, "--search", "-s", help="Filter by search term."),
    json_output: bool = typer.Option(False, "--json", help="Print JSON instead of a table."),
) -> None:
    """List the experiments in a project.

    Example:

        synthgraph experiments list --project <project-id>
    """
    cli: CLIContext = ctx.obj
    out = cli.output(json_output)

    experiments = cli.client().experiments.list(project_id=project, search=search)
    rows = [experiment.to_dict() for experiment in experiments]

    out.emit(rows, lambda: out.table(rows, _COLUMNS, empty="No experiments found."))


@app.command("search")
def search_experiments(
    ctx: typer.Context,
    query: str = typer.Argument(..., help="Search term."),
    project: str = typer.Option(..., "--project", "-p", help="Project ID."),
    json_output: bool = typer.Option(False, "--json", help="Print JSON instead of a table."),
) -> None:
    """Search experiments in a project by name or description.

    The backend performs the search; this does not filter locally.

    Example:

        synthgraph experiments search --project <project-id> "rain"
    """
    cli: CLIContext = ctx.obj
    out = cli.output(json_output)

    experiments = cli.client().experiments.search(project_id=project, query=query)
    rows = [experiment.to_dict() for experiment in experiments]

    out.emit(
        rows,
        lambda: out.table(rows, _COLUMNS, empty=f"No experiments match {query!r}."),
    )


@app.command("get")
def get_experiment(
    ctx: typer.Context,
    experiment_id: str = typer.Argument(..., help="Experiment ID."),
    json_output: bool = typer.Option(False, "--json", help="Print JSON instead of a field list."),
) -> None:
    """Show one experiment.

    Example:

        synthgraph experiments get <experiment-id>
    """
    cli: CLIContext = ctx.obj
    out = cli.output(json_output)

    experiment = cli.client().experiments.get(experiment_id)

    out.emit(
        experiment.to_dict(),
        lambda: out.fields(
            [
                ("ID", experiment.id),
                ("Project", experiment.project_id),
                ("Name", experiment.name),
                ("Description", experiment.description),
                ("Created", experiment.created_at),
                ("Updated", experiment.updated_at),
                ("Metadata", experiment.metadata),
            ]
        ),
    )
