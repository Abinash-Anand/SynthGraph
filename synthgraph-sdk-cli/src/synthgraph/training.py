"""Training run capture (spec 23).

SynthGraph records that training happened and what went into it. It does not
start, wrap or supervise the researcher's training code.
"""

from __future__ import annotations

from typing import Any

from .environment import auto_capture
from .errors import SynthGraphValidationError
from .http import SynthGraphHTTPClient
from .models import DatasetVersion, TrainingRun, TrainingRunMetric
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
TrainingRunMetricList = list[TrainingRunMetric]


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
        capture_environment: bool = True,
    ) -> TrainingRun:
        """Record a training run against an experiment.

        ``datasets`` should reference the exact dataset versions the model was
        trained on, so lineage points at data that cannot change underneath the
        record (spec 4, 21). Each one is attached with its own request after
        the training run itself is created, since the backend does not accept
        dataset references on create.

        ``model``, ``framework`` and ``framework_version`` are the SDK's
        ergonomic names; on the wire they become the backend's nested
        ``trainer`` object (``trainer.name``, ``trainer.type``,
        ``trainer.version``) and ``config`` becomes ``parameters``.

        Every training run is created ``pending`` - the backend does not
        accept a status on create, so passing one is rejected here rather than
        silently ignored.

        ``TrainingRun`` has no dedicated environment/reproducibility field, so
        when ``metadata`` does not already have an ``"environment"`` key,
        ``environment_metadata()`` and ``git_metadata()`` are captured
        automatically and stored under ``metadata["environment"]``. A caller
        who already put something under that key always wins, and
        ``capture_environment=False`` turns this off entirely.
        """
        if status is not None:
            raise SynthGraphValidationError(
                "training runs cannot be created with a status; every run starts pending",
                field="status",
            )

        experiment_id = require_identifier(experiment_id, field="experiment_id")

        # Validated up front, before any network call, so a bad dataset
        # reference never leaves a training run created without it.
        references = normalize_dataset_references(datasets) or []

        trainer = compact(
            {
                "name": require_text(model, field="model"),
                "version": framework_version,
                "type": framework,
            }
        )

        payload: dict[str, Any] = {
            "trainer": trainer,
            "parameters": (
                require_mapping(config, field="config") if config is not None else {}
            ),
        }
        if name is not None:
            payload["name"] = name
        if description is not None:
            payload["description"] = description

        resolved_metadata = (
            require_mapping(metadata, field="metadata") if metadata is not None else {}
        )
        if capture_environment and "environment" not in resolved_metadata:
            resolved_metadata = {**resolved_metadata, "environment": auto_capture()}
        if resolved_metadata:
            payload["metadata"] = resolved_metadata

        data = self._http.post(
            Routes.experiment_training_runs(experiment_id),
            json=payload,
            operation="training_runs.create",
        )

        created = TrainingRun.model_validate(data)

        for reference in references:
            self.add_dataset(
                training_run_id=created.id,
                dataset=_dataset_version_id_from_reference(reference),
                role="training",
            )

        # Attaching a dataset changes what the training run looks like; the
        # create response's `datasets` cannot reflect that yet, so re-fetch
        # rather than return a response that is already stale.
        if references:
            return self.get(created.id)
        return created

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
        role: str = "training",
    ) -> TrainingRun:
        """Attach another dataset version to an existing training run."""
        training_run_id = require_identifier(training_run_id, field="training_run_id")

        references = normalize_dataset_references([dataset])
        assert references is not None  # a one-item list always normalizes
        dataset_version_id = _dataset_version_id_from_reference(references[0])

        data = self._http.post(
            Routes.training_run_datasets(training_run_id),
            json={"datasetVersionId": dataset_version_id, "role": role},
            operation="training_runs.add_dataset",
        )

        return TrainingRun.model_validate(data)

    def start(self, training_run_id: str) -> TrainingRun:
        """Mark a training run as running."""
        return self._update_status(training_run_id, "running")

    def complete(self, training_run_id: str) -> TrainingRun:
        """Mark a training run as completed."""
        return self._update_status(training_run_id, "completed")

    def fail(self, training_run_id: str) -> TrainingRun:
        """Mark a training run as failed.

        Failed runs are kept: a failed training run is still a scientific
        record (spec 5).
        """
        return self._update_status(training_run_id, "failed")

    def log_metric(
        self,
        *,
        training_run_id: str,
        step: int,
        metrics: dict[str, Any],
    ) -> TrainingRunMetric:
        """Record a training-metric observation at a given step.

        Unlike EvaluationResult (one final score against an exact dataset
        version), this is for tracking a metric's value *over the course of*
        training - call it once per step/epoch you want recorded.
        """
        training_run_id = require_identifier(training_run_id, field="training_run_id")

        if isinstance(step, bool) or not isinstance(step, int):
            raise SynthGraphValidationError(
                f"step must be an int, got {type(step).__name__}",
                field="step",
            )

        payload = {
            "step": step,
            "metrics": require_mapping(metrics, field="metrics"),
        }

        data = self._http.post(
            Routes.training_run_metrics(training_run_id),
            json=payload,
            operation="training_runs.log_metric",
        )

        return TrainingRunMetric.model_validate(data)

    def metrics(self, *, training_run_id: str) -> TrainingRunMetricList:
        """List the metric points recorded for a training run, ordered by step."""
        training_run_id = require_identifier(training_run_id, field="training_run_id")

        data = self._http.get_list(
            Routes.training_run_metrics(training_run_id),
            operation="training_runs.metrics",
        )

        return [TrainingRunMetric.model_validate(item) for item in data]

    def update_capture_status(
        self,
        *,
        training_run_id: str,
        status: str,
        integrations: dict[str, dict[str, Any]],
    ) -> TrainingRun:
        """Report which integrations were attached to this training run and
        whether each closed cleanly.

        Called by ``TrainingHandle.close()`` - not meant to be called
        directly in normal use, since it reports ``IntegrationSession``'s own
        bookkeeping rather than anything a researcher decides. See
        ``integration_session.py`` and CONTRACT.md 2.26/2.27.
        """
        training_run_id = require_identifier(training_run_id, field="training_run_id")

        payload = {
            "status": require_text(status, field="status"),
            "integrations": require_mapping(integrations, field="integrations"),
        }

        data = self._http.patch(
            Routes.training_run_capture_status(training_run_id),
            json=payload,
            operation="training_runs.update_capture_status",
        )

        return TrainingRun.model_validate(data)

    def _update_status(self, training_run_id: str, status: str) -> TrainingRun:
        """Update the lifecycle status of a training run."""
        training_run_id = require_identifier(training_run_id, field="training_run_id")

        data = self._http.patch(
            Routes.training_run(training_run_id),
            json={"status": status},
            operation=f"training_runs.{status}",
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


def _dataset_version_id_from_reference(reference: dict[str, Any]) -> Any:
    """Pull the dataset-version id out of a normalized dataset reference.

    ``normalize_dataset_references`` keys a bare ID or a ``DatasetVersion``
    under ``"id"``. A mapping is passed through as given, so it must already
    carry an ``"id"`` for this to have anything to attach.
    """
    dataset_version_id = reference.get("id")
    if dataset_version_id is None:
        raise SynthGraphValidationError(
            "dataset reference has no id to attach; pass a dataset version ID, a "
            "DatasetVersion, or a mapping with an 'id' key",
            field="dataset",
        )
    return dataset_version_id
