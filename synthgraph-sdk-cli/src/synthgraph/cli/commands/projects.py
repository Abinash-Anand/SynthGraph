"""``synthgraph projects`` (spec 46)."""

from __future__ import annotations

import typer

from ..context import CLIContext

app = typer.Typer(
    no_args_is_help=True,
    help="List and inspect projects.",
)


@app.command("list")
def list_projects(
    ctx: typer.Context,
    json_output: bool = typer.Option(False, "--json", help="Print JSON instead of a table."),
) -> None:
    """List the projects visible to your account.

    Example:

        synthgraph projects list
    """
    cli: CLIContext = ctx.obj
    out = cli.output(json_output)

    projects = cli.client().projects.list()

    out.emit(
        [project.to_dict() for project in projects],
        lambda: out.table(
            [project.to_dict() for project in projects],
            [("ID", "id"), ("NAME", "name"), ("CREATED", "created_at")],
            empty="No projects yet.",
        ),
    )


@app.command("get")
def get_project(
    ctx: typer.Context,
    project_id: str = typer.Argument(..., help="Project ID."),
    json_output: bool = typer.Option(False, "--json", help="Print JSON instead of a field list."),
) -> None:
    """Show one project.

    Example:

        synthgraph projects get 1d0c...  --json
    """
    cli: CLIContext = ctx.obj
    out = cli.output(json_output)

    project = cli.client().projects.get(project_id)

    out.emit(
        project.to_dict(),
        lambda: out.fields(
            [
                ("ID", project.id),
                ("Name", project.name),
                ("Description", project.description),
                ("Created", project.created_at),
                ("Updated", project.updated_at),
                ("Metadata", project.metadata),
            ]
        ),
    )
