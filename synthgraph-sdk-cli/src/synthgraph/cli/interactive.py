"""Interactive resolution of an omitted ID (spec 52 extension).

Every lookup command needs an ID from somewhere up the resource hierarchy
(a project, an experiment, a training run...). Historically the only way to
supply one was to already know it and type it. These resolvers add two more
sources, tried in order, before finally asking:

1. remembered - the last ID of that kind this CLI used, on this machine
   (``state.py``)
2. picked - an interactive numbered menu, fetched live from the backend,
   drilling into whatever parent scope (project, experiment, ...) is needed
   first

Both are skipped entirely unless a real human is at the keyboard right now
(``is_interactive()``): a script or a test that omits a required ID gets
exactly the same usage error it always did, never a hanging prompt.
"""

from __future__ import annotations

import sys
from collections.abc import Callable, Sequence
from typing import TypeVar

import typer

from ..errors import SynthGraphConfigurationError
from ..models import (
    AssetVersion,
    DatasetVersion,
    EvaluationResult,
    Experiment,
    GenerationRun,
    TrainingRun,
)
from .context import CLIContext

__all__ = [
    "is_interactive",
    "resolve_asset",
    "resolve_asset_version",
    "resolve_dataset",
    "resolve_dataset_version",
    "resolve_evaluation",
    "resolve_experiment",
    "resolve_generation",
    "resolve_project",
    "resolve_training_run",
]

T = TypeVar("T")


def is_interactive() -> bool:
    """Whether a human is at the keyboard right now, not a script or a test."""
    try:
        return sys.stdin.isatty()
    except (AttributeError, ValueError):
        return False


def _resolve(
    ctx: typer.Context,
    value: str | None,
    *,
    state_key: str,
    usage_hint: str,
    empty_hint: str,
    list_items: Callable[[], Sequence[T]],
    id_of: Callable[[T], str],
    label_of: Callable[[T], str],
) -> str:
    cli: CLIContext = ctx.obj
    state = cli.state()

    if value:
        state.set(state_key, value)
        return value

    if not is_interactive():
        raise SynthGraphConfigurationError(usage_hint)

    items = list_items()
    if not items:
        raise SynthGraphConfigurationError(empty_hint)

    remembered = state.get(state_key)
    out = cli.output()
    out.note("No ID given. Pick one:")

    default_index: int | None = None
    for index, item in enumerate(items, start=1):
        marker = "  (last used)" if id_of(item) == remembered else ""
        out.note(f"  {index}. {label_of(item)}{marker}")
        if id_of(item) == remembered:
            default_index = index

    raw = typer.prompt(
        f"Enter a number (1-{len(items)})",
        default=str(default_index) if default_index else None,
    )

    try:
        choice = int(raw)
    except ValueError:
        choice = -1
    if not 1 <= choice <= len(items):
        raise SynthGraphConfigurationError(f"{raw!r} is not one of the listed numbers.")

    chosen_id = id_of(items[choice - 1])
    state.set(state_key, chosen_id)
    return chosen_id


def resolve_project(ctx: typer.Context, project_id: str | None) -> str:
    """Resolve a project ID: explicit value, then remembered, then a pick."""
    cli: CLIContext = ctx.obj

    return _resolve(
        ctx,
        project_id,
        state_key="project_id",
        usage_hint=(
            "A project ID is required (not running interactively - pass one "
            "explicitly, or run `synthgraph projects list` to find one)."
        ),
        empty_hint="You have no projects yet - create one with the SDK first.",
        # Not equivalent to a bare method reference: that would call
        # cli.client() immediately, even when project_id was already given
        # and no network call - or client - is needed at all.
        list_items=lambda: cli.client().projects.list(),  # noqa: PLW0108
        id_of=lambda project: project.id,
        label_of=lambda project: f"{project.name} ({project.id})",
    )


def resolve_experiment(
    ctx: typer.Context,
    experiment_id: str | None,
    *,
    project_id: str | None = None,
) -> str:
    """Resolve an experiment ID, drilling into a project pick first if needed."""
    cli: CLIContext = ctx.obj

    def list_items() -> Sequence[Experiment]:
        resolved_project_id = project_id or resolve_project(ctx, None)
        return cli.client().experiments.list(project_id=resolved_project_id)

    return _resolve(
        ctx,
        experiment_id,
        state_key="experiment_id",
        usage_hint=(
            "An experiment ID is required (not running interactively - pass one "
            "explicitly, or run `synthgraph experiments list --project <id>` to "
            "find one)."
        ),
        empty_hint="That project has no experiments yet - create one with the SDK first.",
        list_items=list_items,
        id_of=lambda experiment: experiment.id,
        label_of=lambda experiment: f"{experiment.name} ({experiment.id})",
    )


def resolve_generation(
    ctx: typer.Context,
    generation_id: str | None,
    *,
    experiment_id: str | None = None,
) -> str:
    """Resolve a generation ID, drilling into an experiment pick first if needed."""
    cli: CLIContext = ctx.obj

    def list_items() -> Sequence[GenerationRun]:
        resolved_experiment_id = experiment_id or resolve_experiment(ctx, None)
        return cli.client().generations.list(experiment_id=resolved_experiment_id)

    return _resolve(
        ctx,
        generation_id,
        state_key="generation_id",
        usage_hint=(
            "A generation ID is required (not running interactively - pass one "
            "explicitly, or run `synthgraph generations list --experiment <id>` "
            "to find one)."
        ),
        empty_hint="That experiment has no generations yet - create one with the SDK first.",
        list_items=list_items,
        id_of=lambda generation: generation.id,
        label_of=lambda generation: f"{generation.name} ({generation.status.value})",
    )


def resolve_training_run(
    ctx: typer.Context,
    training_run_id: str | None,
    *,
    experiment_id: str | None = None,
) -> str:
    """Resolve a training run ID, drilling into an experiment pick first if needed."""
    cli: CLIContext = ctx.obj

    def list_items() -> Sequence[TrainingRun]:
        resolved_experiment_id = experiment_id or resolve_experiment(ctx, None)
        return cli.client().training_runs.list(experiment_id=resolved_experiment_id)

    return _resolve(
        ctx,
        training_run_id,
        state_key="training_run_id",
        usage_hint=(
            "A training run ID is required (not running interactively - pass one "
            "explicitly, or run `synthgraph training-runs list --experiment <id>` "
            "to find one)."
        ),
        empty_hint="That experiment has no training runs yet - create one with the SDK first.",
        list_items=list_items,
        id_of=lambda run: run.id,
        label_of=lambda run: f"{run.name or run.id} - {run.status}",
    )


def resolve_evaluation(
    ctx: typer.Context,
    evaluation_id: str | None,
    *,
    training_run_id: str | None = None,
) -> str:
    """Resolve an evaluation ID, drilling into a training-run pick first if needed."""
    cli: CLIContext = ctx.obj

    def list_items() -> Sequence[EvaluationResult]:
        resolved_training_run_id = training_run_id or resolve_training_run(ctx, None)
        return cli.client().evaluations.list(training_run_id=resolved_training_run_id)

    return _resolve(
        ctx,
        evaluation_id,
        state_key="evaluation_id",
        usage_hint=(
            "An evaluation ID is required (not running interactively - pass one "
            "explicitly, or run `synthgraph evaluations list --training-run <id>` "
            "to find one)."
        ),
        empty_hint="That training run has no evaluations yet - create one with the SDK first.",
        list_items=list_items,
        id_of=lambda evaluation: evaluation.id,
        label_of=lambda evaluation: f"{evaluation.name or evaluation.id}",
    )


def resolve_asset(ctx: typer.Context, asset_id: str | None) -> str:
    """Resolve an asset ID: explicit value, then remembered, then a pick."""
    cli: CLIContext = ctx.obj

    return _resolve(
        ctx,
        asset_id,
        state_key="asset_id",
        usage_hint=(
            "An asset ID is required (not running interactively - pass one "
            "explicitly, or run `synthgraph assets list` to find one)."
        ),
        empty_hint="You have no assets yet - create one with the SDK first.",
        list_items=lambda: cli.client().assets.list(),  # noqa: PLW0108
        id_of=lambda asset: asset.id,
        label_of=lambda asset: f"{asset.name} ({asset.type or 'asset'})",
    )


def resolve_asset_version(ctx: typer.Context, asset_version_id: str | None) -> str:
    """Resolve an asset version ID, drilling into an asset pick first if needed."""
    cli: CLIContext = ctx.obj

    def list_items() -> Sequence[AssetVersion]:
        asset_id = resolve_asset(ctx, None)
        return cli.client().assets.list_versions(asset_id)

    return _resolve(
        ctx,
        asset_version_id,
        state_key="asset_version_id",
        usage_hint=(
            "An asset version ID is required (not running interactively - pass "
            "one explicitly, or run `synthgraph assets versions <asset-id>` to "
            "find one)."
        ),
        empty_hint="That asset has no versions yet - create one with the SDK first.",
        list_items=list_items,
        id_of=lambda version: version.id,
        label_of=lambda version: f"{version.version} - {version.uri}",
    )


def resolve_dataset(ctx: typer.Context, dataset_id: str | None) -> str:
    """Resolve a dataset ID: explicit value, then remembered, then a pick."""
    cli: CLIContext = ctx.obj

    return _resolve(
        ctx,
        dataset_id,
        state_key="dataset_id",
        usage_hint=(
            "A dataset ID is required (not running interactively - pass one "
            "explicitly, or run `synthgraph datasets list` to find one)."
        ),
        empty_hint="You have no datasets yet - create one with the SDK first.",
        list_items=lambda: cli.client().datasets.list(),  # noqa: PLW0108
        id_of=lambda dataset: dataset.id,
        label_of=lambda dataset: dataset.name or dataset.id,
    )


def resolve_dataset_version(ctx: typer.Context, dataset_version_id: str | None) -> str:
    """Resolve a dataset version ID, drilling into a dataset pick first if needed."""
    cli: CLIContext = ctx.obj

    def list_items() -> Sequence[DatasetVersion]:
        dataset_id = resolve_dataset(ctx, None)
        return cli.client().datasets.list_versions(dataset_id)

    return _resolve(
        ctx,
        dataset_version_id,
        state_key="dataset_version_id",
        usage_hint=(
            "A dataset version ID is required (not running interactively - pass "
            "one explicitly, or run `synthgraph datasets versions <dataset-id>` "
            "to find one)."
        ),
        empty_hint="That dataset has no versions yet - create one with the SDK first.",
        list_items=list_items,
        id_of=lambda version: version.id,
        label_of=lambda version: f"{version.version} - {version.uri}",
    )
