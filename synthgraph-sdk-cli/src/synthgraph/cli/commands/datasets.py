"""``synthgraph datasets`` (spec 21, 47)."""

from __future__ import annotations

import typer

from ..context import CLIContext
from ..interactive import resolve_dataset, resolve_dataset_version

app = typer.Typer(
    no_args_is_help=True,
    help="List and inspect dataset references and their versions.",
)

_COLUMNS = [("ID", "id"), ("NAME", "name"), ("CREATED", "created_at")]

_VERSION_COLUMNS = [
    ("ID", "id"),
    ("VERSION", "version"),
    ("FORMAT", "format"),
    ("URI", "uri"),
    ("CREATED", "created_at"),
]


@app.command("list")
def list_datasets(
    ctx: typer.Context,
    json_output: bool = typer.Option(False, "--json", help="Print JSON instead of a table."),
) -> None:
    """List every dataset the authenticated user owns.

    Example:

        synthgraph datasets list
    """
    cli: CLIContext = ctx.obj
    out = cli.output(json_output)

    datasets = cli.client().datasets.list()
    rows = [dataset.to_dict() for dataset in datasets]

    out.emit(rows, lambda: out.table(rows, _COLUMNS, empty="No datasets found."))


@app.command("get")
def get_dataset(
    ctx: typer.Context,
    dataset_id: str | None = typer.Argument(None, help="Dataset ID."),
    json_output: bool = typer.Option(False, "--json", help="Print JSON instead of a field list."),
) -> None:
    """Show one dataset's logical identity.

    Omitting the ID in an interactive terminal prompts you to pick one.

    Example:

        synthgraph datasets get <dataset-id>
    """
    cli: CLIContext = ctx.obj
    out = cli.output(json_output)
    dataset_id = resolve_dataset(ctx, dataset_id)

    dataset = cli.client().datasets.get(dataset_id)

    out.emit(
        dataset.to_dict(),
        lambda: out.fields(
            [
                ("ID", dataset.id),
                ("Name", dataset.name),
                ("Description", dataset.description),
                ("Created", dataset.created_at),
                ("Updated", dataset.updated_at),
                ("Metadata", dataset.metadata),
            ]
        ),
    )


@app.command("versions")
def list_dataset_versions(
    ctx: typer.Context,
    dataset_id: str | None = typer.Argument(None, help="Dataset ID."),
    json_output: bool = typer.Option(False, "--json", help="Print JSON instead of a table."),
) -> None:
    """List the versions recorded for a dataset.

    Omitting the ID in an interactive terminal prompts you to pick one.

    Example:

        synthgraph datasets versions <dataset-id>
    """
    cli: CLIContext = ctx.obj
    out = cli.output(json_output)
    dataset_id = resolve_dataset(ctx, dataset_id)

    versions = cli.client().datasets.list_versions(dataset_id)
    rows = [version.to_dict() for version in versions]

    out.emit(rows, lambda: out.table(rows, _VERSION_COLUMNS, empty="No versions found."))


@app.command("get-version")
def get_dataset_version(
    ctx: typer.Context,
    dataset_version_id: str | None = typer.Argument(None, help="Dataset version ID."),
    json_output: bool = typer.Option(False, "--json", help="Print JSON instead of a field list."),
) -> None:
    """Show one immutable dataset version.

    Omitting the ID in an interactive terminal prompts you to pick a
    dataset, then a version of it.

    Example:

        synthgraph datasets get-version <dataset-version-id>
    """
    cli: CLIContext = ctx.obj
    out = cli.output(json_output)
    dataset_version_id = resolve_dataset_version(ctx, dataset_version_id)

    version = cli.client().datasets.get_version(dataset_version_id)

    out.emit(
        version.to_dict(),
        lambda: out.fields(
            [
                ("ID", version.id),
                ("Dataset", version.dataset_id),
                ("Version", version.version),
                ("Format", version.format),
                ("URI", version.uri),
                ("Checksum", version.checksum),
                ("Size", version.size),
                ("Created", version.created_at),
                ("Metadata", version.metadata),
            ]
        ),
    )
