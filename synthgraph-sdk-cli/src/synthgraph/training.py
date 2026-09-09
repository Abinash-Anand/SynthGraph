"""Training run capture (spec 23).

SynthGraph records that training happened and what went into it. It does not
start, wrap or supervise the researcher's training code.

The routes used here are flagged UNVERIFIED in CONTRACT.md: the spec (63)
requires them to be checked against the backend's training-run controller
before v1.0.
"""

from __future__ import annotations

from typing import Any

from .errors import SynthGraphValidationError
from .http import SynthGraphHTTPClient
from .models import DatasetVersion, TrainingRun
from .routes import Routes
from .serialization import (
    compact,
    require_identifier,
    require_mapping,
    require_sequence,
    require_text,
)

DatasetInput = str | DatasetVersion | dict[str, Any]

#: Aliases so annotations inside the class body are not shadowed by
#: ``TrainingRunsAPI.list``.
TrainingRunList = list[TrainingRun]
DatasetInputs = list[DatasetInput]


class TrainingRunsAPI:
    """API operations for training runs."""

    def __init__(self, http: SynthGraphHTTPClient) -> None:
        self._http = http

    def create(
        self,
        *,
        experiment_id: str,
        model: str,
        framework: str | None = None,
        framework_version: str | None = None,
        datasets: DatasetInputs | None = None,
        config: dict[str, Any] | None = None,
        name: str | None = None,
        description: str | None = None,
        status: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> TrainingRun:
        """Record a training run against an experiment.

        ``datasets`` should reference the exact dataset versions the model was
        trained on, so lineage points at data that cannot change underneath the
        record (spec 4, 21).
        """
        experiment_id = require_identifier(experiment_id, field="experiment_id")

        payload = compact(
            {
                "name": name,
                "description": description,
                "model": require_text(model, field="model"),
                "framework": framework,
                "framework_version": framework_version,
                "config": (
                    require_mapping(config, field="config") if config is not None else None
                ),
                "datasets": normalize_dataset_references(datasets),
                "status": status,
                "metadata": (
                    require_mapping(metadata, field="metadata") if metadata is not None else None
                ),
            }
        )

        data = self._http.post(
            Routes.experiment_training_runs(experiment_id),
            json=payload,
            operation="training_runs.create",
        )

        return TrainingRun.model_validate(data)

    def get(self, training_run_id: str) -> TrainingRun:
        """Retrieve a training run by ID."""
        training_run_id = require_identifier(training_run_id, field="training_run_id")

        data = self._http.get(
            Routes.training_run(training_run_id),
            operation="training_runs.get",
        )

        return TrainingRun.model_validate(data)

    def list(self, *, experiment_id: str) -> TrainingRunList:
        """List training runs belonging to an experiment."""
        experiment_id = require_identifier(experiment_id, field="experiment_id")

        data = self._http.get_list(
            Routes.experiment_training_runs(experiment_id),
            operation="training_runs.list",
        )

        return [TrainingRun.model_validate(item) for item in data]

    def add_dataset(
        self,
        *,
        training_run_id: str,
        dataset: DatasetInput,
    ) -> TrainingRun:
        """Attach another dataset version to an existing training run."""
        training_run_id = require_identifier(training_run_id, field="training_run_id")

        references = normalize_dataset_references([dataset])
        assert references is not None  # a one-item list always normalizes

        data = self._http.post(
            Routes.training_run_datasets(training_run_id),
            json=references[0],
            operation="training_runs.add_dataset",
        )

        return TrainingRun.model_validate(data)


def normalize_dataset_references(
    datasets: DatasetInputs | None,
) -> list[dict[str, Any]] | None:
    """Turn dataset inputs into wire objects.

    A bare string is a dataset-version ID.
    """
    if datasets is None:
        return None

    normalized: list[dict[str, Any]] = []
    for index, dataset in enumerate(require_sequence(datasets, field="datasets")):
        field = f"datasets[{index}]"
        if isinstance(dataset, str):
            normalized.append({"id": require_identifier(dataset, field=field)})
        elif isinstance(dataset, DatasetVersion):
            normalized.append({"id": dataset.id})
        elif isinstance(dataset, dict):
            normalized.append(require_mapping(dataset, field=field))
        else:
            raise SynthGraphValidationError(
                f"{field} must be a dataset version ID, a DatasetVersion or a mapping, "
                f"got {type(dataset).__name__}",
                field=field,
            )
    return normalized
