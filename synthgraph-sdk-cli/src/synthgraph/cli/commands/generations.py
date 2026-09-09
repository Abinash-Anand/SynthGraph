"""``synthgraph generations`` (spec 48)."""

from __future__ import annotations

import json
from typing import Any

import typer

from ...errors import SynthGraphValidationError
from ..context import CLIContext

app = typer.Typer(
    no_args_is_help=True,
    help="List and inspect generation runs.",
)


@app.command("list")
def list_generations(
    ctx: typer.Context,
    experiment: str = typer.Option(..., "--experiment", "-e", help="Experiment ID."),
    parameters: str | None = typer.Option(
        None,
        "--parameters",
        help='Filter by generation parameters, as a JSON object: \'{"weather":"rain"}\'',
    ),
    json_output: bool = typer.Option(False, "--json", help="Print JSON instead of a table."),
) -> None:
    """List the generation runs in an experiment.

    Filtering is performed by the backend.

    Examples:

        synthgraph generations list --experiment <experiment-id>

        synthgraph generations list --experiment <experiment-id> \\
            --parameters '{"weather":"rain","occlusion":0.3}'
    """
    cli: CLIContext = ctx.obj
    out = cli.output(json_output)

    generations = cli.client().generations.list(
        experiment_id=experiment,
        parameters=_parse_parameters(parameters),
    )

    rows = [
        {
            "id": generation.id,
            "name": generation.name,
            "generator": generation.generator.name,
            "version": generation.generator.version,
            "status": generation.status.value,
            "created_at": generation.created_at,
        }
        for generation in generations
    ]
    payload = [generation.to_dict() for generation in generations]

    out.emit(
        payload,
        lambda: out.table(
            rows,
            [
                ("ID", "id"),
                ("NAME", "name"),
                ("GENERATOR", "generator"),
                ("VERSION", "version"),
                ("STATUS", "status"),
                ("CREATED", "created_at"),
            ],
            empty="No generations found.",
        ),
    )


@app.command("get")
def get_generation(
    ctx: typer.Context,
    generation_id: str = typer.Argument(..., help="Generation ID."),
    json_output: bool = typer.Option(False, "--json", help="Print JSON instead of a field list."),
) -> None:
    """Show one generation run, including its parameters and provenance.

    Example:

        synthgraph generations get <generation-id> --json
    """
    cli: CLIContext = ctx.obj
    out = cli.output(json_output)

    generation = cli.client().generations.get(generation_id)

    out.emit(
        generation.to_dict(),
        lambda: out.fields(
            [
                ("ID", generation.id),
                ("Experiment", generation.experiment_id),
                ("Name", generation.name),
                ("Description", generation.description),
                ("Generator", generation.generator.name),
                ("Generator version", generation.generator.version),
                ("Generator type", generation.generator.type),
                ("Status", generation.status.value),
                ("Parameters", generation.parameters),
                ("Reproducibility", generation.reproducibility.model_dump(mode="json")),
                ("Inputs", [item.model_dump(mode="json") for item in generation.inputs]),
                ("Outputs", [item.model_dump(mode="json") for item in generation.outputs]),
                ("Started", generation.started_at),
                ("Completed", generation.completed_at),
                ("Created", generation.created_at),
                ("Metadata", generation.metadata),
            ]
        ),
    )


def _parse_parameters(raw: str | None) -> dict[str, Any] | None:
    """Parse the --parameters JSON object, failing with a usable message."""
    if raw is None:
        return None
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise SynthGraphValidationError(
            f"--parameters must be a JSON object ({exc.msg} at position {exc.pos})",
            field="parameters",
        ) from None
    if not isinstance(parsed, dict):
        raise SynthGraphValidationError(
            "--parameters must be a JSON object, for example "
            '\'{"weather":"rain"}\'',
            field="parameters",
        )
    return parsed
