"""``synthgraph assets`` (spec 22, 47)."""

from __future__ import annotations

import typer

from ..context import CLIContext

app = typer.Typer(
    no_args_is_help=True,
    help="List and inspect asset references and their versions.",
)

_COLUMNS = [("ID", "id"), ("NAME", "name"), ("TYPE", "type"), ("CREATED", "created_at")]

_VERSION_COLUMNS = [
    ("ID", "id"),
    ("VERSION", "version"),
    ("URI", "uri"),
    ("CREATED", "created_at"),
]


@app.command("list")
def list_assets(
    ctx: typer.Context,
    json_output: bool = typer.Option(False, "--json", help="Print JSON instead of a table."),
) -> None:
    """List every asset the authenticated user owns.

    Example:

        synthgraph assets list
    """
    cli: CLIContext = ctx.obj
    out = cli.output(json_output)

    assets = cli.client().assets.list()
    rows = [asset.to_dict() for asset in assets]

    out.emit(rows, lambda: out.table(rows, _COLUMNS, empty="No assets found."))


@app.command("get")
def get_asset(
    ctx: typer.Context,
    asset_id: str = typer.Argument(..., help="Asset ID."),
    json_output: bool = typer.Option(False, "--json", help="Print JSON instead of a field list."),
) -> None:
    """Show one asset's logical identity.

    Example:

        synthgraph assets get <asset-id>
    """
    cli: CLIContext = ctx.obj
    out = cli.output(json_output)

    asset = cli.client().assets.get(asset_id)

    out.emit(
        asset.to_dict(),
        lambda: out.fields(
            [
                ("ID", asset.id),
                ("Name", asset.name),
                ("Type", asset.type),
                ("Description", asset.description),
                ("Created", asset.created_at),
                ("Updated", asset.updated_at),
                ("Metadata", asset.metadata),
            ]
        ),
    )


@app.command("versions")
def list_asset_versions(
    ctx: typer.Context,
    asset_id: str = typer.Argument(..., help="Asset ID."),
    json_output: bool = typer.Option(False, "--json", help="Print JSON instead of a table."),
) -> None:
    """List the versions recorded for an asset.

    Example:

        synthgraph assets versions <asset-id>
    """
    cli: CLIContext = ctx.obj
    out = cli.output(json_output)

    versions = cli.client().assets.list_versions(asset_id)
    rows = [version.to_dict() for version in versions]

    out.emit(rows, lambda: out.table(rows, _VERSION_COLUMNS, empty="No versions found."))


@app.command("get-version")
def get_asset_version(
    ctx: typer.Context,
    asset_version_id: str = typer.Argument(..., help="Asset version ID."),
    json_output: bool = typer.Option(False, "--json", help="Print JSON instead of a field list."),
) -> None:
    """Show one immutable asset version.

    Example:

        synthgraph assets get-version <asset-version-id>
    """
    cli: CLIContext = ctx.obj
    out = cli.output(json_output)

    version = cli.client().assets.get_version(asset_version_id)

    out.emit(
        version.to_dict(),
        lambda: out.fields(
            [
                ("ID", version.id),
                ("Asset", version.asset_id),
                ("Version", version.version),
                ("URI", version.uri),
                ("Checksum", version.checksum),
                ("Size", version.size),
                ("Created", version.created_at),
                ("Metadata", version.metadata),
            ]
        ),
    )
