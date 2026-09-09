"""The ergonomic capture surface (spec 11, 35).

These handles wrap a resource API and an already-created record, so a research
script reads the way the work actually happened::

    with SynthGraph(api_key=...) as sg:
        experiment = sg.experiment(name="vehicle_detection_rain")

        with experiment.generation(
            generator="blender",
            generator_version="4.2",
            parameters={"weather": "rain", "occlusion": 0.3},
            seed=42,
        ) as generation:
            run_blender()                      # the researcher's own code
            dataset = generation.dataset(name="rain_v1", uri="/data/rain_v1")

        training = experiment.training(model="yolo", framework="pytorch",
                                       datasets=[dataset], config={"epochs": 50})
        training.evaluation(metrics={"mAP": 0.724})

Every handle is a thin view over the same resource APIs. Nothing here talks
HTTP, and nothing here decides anything the backend should decide.
"""

from __future__ import annotations

import contextlib
from types import TracebackType
from typing import TYPE_CHECKING, Any, Self

from .errors import SynthGraphError, SynthGraphValidationError
from .models import (
    DatasetVersion,
    EvaluationResult,
    Experiment,
    GenerationRun,
    GenerationStatus,
    Generator,
    Project,
    ReproductionManifest,
    TrainingRun,
)

if TYPE_CHECKING:  # pragma: no cover - import cycle only matters to type checkers
    from .client import SynthGraphClient

__all__ = [
    "EvaluationHandle",
    "ExperimentHandle",
    "GenerationHandle",
    "ProjectHandle",
    "TrainingHandle",
]


class _Handle:
    """Common plumbing: a record plus the client that produced it."""

    def __init__(self, client: SynthGraphClient) -> None:
        self._client = client


class ProjectHandle(_Handle):
    """A project, with its experiments hanging off it."""

    def __init__(self, client: SynthGraphClient, project: Project) -> None:
        super().__init__(client)
        self.project = project

    @property
    def id(self) -> str:
        return self.project.id

    @property
    def name(self) -> str:
        return self.project.name

    def experiment(
        self,
        name: str,
        *,
        description: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> ExperimentHandle:
        """Create an experiment in this project."""
        experiment = self._client.experiments.create(
            project_id=self.id,
            name=name,
            description=description,
            metadata=metadata,
        )
        return ExperimentHandle(self._client, experiment)

    def experiments(self, *, search: str | None = None) -> list[Experiment]:
        """List (or search) the experiments in this project."""
        return self._client.experiments.list(project_id=self.id, search=search)

    def refresh(self) -> ProjectHandle:
        """Re-read this project from the backend."""
        return ProjectHandle(self._client, self._client.projects.get(self.id))

    def __repr__(self) -> str:
        return f"ProjectHandle(id={self.id!r}, name={self.name!r})"


class ExperimentHandle(_Handle):
    """An experiment, with generations and training runs hanging off it."""

    def __init__(self, client: SynthGraphClient, experiment: Experiment) -> None:
        super().__init__(client)
        self.experiment = experiment

    @property
    def id(self) -> str:
        return self.experiment.id

    @property
    def name(self) -> str:
        return self.experiment.name

    def generation(self, name: str | None = None, **kwargs: Any) -> GenerationHandle:
        """Create a generation in this experiment.

        The generation is created in its ``pending`` state; it is not started
        here. Use ``.start()`` or the context manager (see
        :class:`GenerationHandle`) to move it to ``running``.
        """
        generator = kwargs.get("generator")
        resolved_name = name or kwargs.pop("name", None) or _default_generation_name(generator)
        kwargs.pop("name", None)

        generation = self._client.generations.create(
            experiment_id=self.id,
            name=resolved_name,
            **kwargs,
        )
        return GenerationHandle(self._client, generation)

    def generations(self, *, parameters: dict[str, Any] | None = None) -> list[GenerationRun]:
        """List (or parameter-filter) the generations in this experiment."""
        return self._client.generations.list(experiment_id=self.id, parameters=parameters)

    def training(self, **kwargs: Any) -> TrainingHandle:
        """Record a training run for this experiment.

        This records provenance only. It does not start training - the
        researcher's own training code keeps running exactly as before.
        """
        datasets = kwargs.pop("datasets", None)
        dataset = kwargs.pop("dataset", None)
        if dataset is not None:
            if datasets is not None:
                raise SynthGraphValidationError(
                    "pass either dataset= or datasets=, not both",
                    field="dataset",
                )
            datasets = [dataset]

        training_run = self._client.training_runs.create(
            experiment_id=self.id,
            datasets=_unwrap_datasets(datasets),
            **kwargs,
        )
        return TrainingHandle(self._client, training_run)

    def training_runs(self) -> list[TrainingRun]:
        """List the training runs recorded for this experiment."""
        return self._client.training_runs.list(experiment_id=self.id)

    def refresh(self) -> ExperimentHandle:
        """Re-read this experiment from the backend."""
        return ExperimentHandle(self._client, self._client.experiments.get(self.id))

    def __enter__(self) -> Self:
        return self

    def __exit__(
        self,
        exc_type: type[BaseException] | None,
        exc_value: BaseException | None,
        traceback: TracebackType | None,
    ) -> None:
        """Experiments have no lifecycle, so leaving the block changes nothing."""
        return

    def __repr__(self) -> str:
        return f"ExperimentHandle(id={self.id!r}, name={self.name!r})"


class GenerationHandle(_Handle):
    """A generation run, with explicit lifecycle control.

    **Context manager semantics** (spec 35 requires these to be spelled out):

    * entering the block calls ``start()`` if the generation is still
      ``pending``; an already-running generation is left alone
    * leaving the block normally calls ``complete()``
    * leaving the block because of an exception calls ``fail()`` and then
      re-raises - the original exception is never swallowed
    * if the lifecycle call itself fails on the error path, the researcher's
      original exception still wins

    A generation that is already ``completed`` or ``failed`` is not transitioned
    again. If those semantics are not what an experiment needs, call ``start()``,
    ``complete()`` and ``fail()`` directly and skip the ``with`` block.
    """

    def __init__(self, client: SynthGraphClient, generation: GenerationRun) -> None:
        super().__init__(client)
        self.generation = generation

    @property
    def id(self) -> str:
        return self.generation.id

    @property
    def status(self) -> str:
        return self.generation.status.value

    def start(self) -> GenerationHandle:
        """Mark this generation as running."""
        self.generation = self._client.generations.start(self.id)
        return self

    def complete(self) -> GenerationHandle:
        """Mark this generation as completed."""
        self.generation = self._client.generations.complete(self.id)
        return self

    def fail(self) -> GenerationHandle:
        """Mark this generation as failed."""
        self.generation = self._client.generations.fail(self.id)
        return self

    def refresh(self) -> GenerationHandle:
        """Re-read this generation from the backend."""
        self.generation = self._client.generations.get(self.id)
        return self

    def dataset(
        self,
        *,
        name: str,
        uri: str,
        **kwargs: Any,
    ) -> DatasetVersion:
        """Record a dataset this generation produced or consumed.

        Metadata only - the data itself stays where it is (spec 6).
        """
        return self._client.datasets.create(
            generation_id=self.id,
            name=name,
            uri=uri,
            **kwargs,
        )

    def manifest(self) -> ReproductionManifest:
        """Retrieve this generation's reproduction manifest."""
        return self._client.reproduction.get(self.id)

    def documentation(self) -> str:
        """Retrieve backend-generated Markdown documentation for this generation."""
        return self._client.documentation.get(self.id)

    def __enter__(self) -> Self:
        if self.generation.status is GenerationStatus.PENDING:
            self.start()
        return self

    def __exit__(
        self,
        exc_type: type[BaseException] | None,
        exc_value: BaseException | None,
        traceback: TracebackType | None,
    ) -> None:
        if self.generation.status.is_terminal:
            return

        if exc_type is None:
            self.complete()
            return

        # The researcher's exception is the important one; a bookkeeping
        # failure must not mask it. The generation then stays in whatever state
        # the backend holds, which is honest (spec 7.5).
        with contextlib.suppress(SynthGraphError):
            self.fail()
        return

    def __repr__(self) -> str:
        return f"GenerationHandle(id={self.id!r}, status={self.status!r})"


class TrainingHandle(_Handle):
    """A training run, with its evaluations hanging off it."""

    def __init__(self, client: SynthGraphClient, training_run: TrainingRun) -> None:
        super().__init__(client)
        self.training_run = training_run

    @property
    def id(self) -> str:
        return self.training_run.id

    def evaluation(
        self,
        *,
        metrics: dict[str, Any],
        dataset_version_id: str | None = None,
        name: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> EvaluationHandle:
        """Record an evaluation of this training run."""
        result = self._client.evaluations.create(
            training_run_id=self.id,
            metrics=metrics,
            dataset_version_id=dataset_version_id,
            name=name,
            metadata=metadata,
        )
        return EvaluationHandle(self._client, result)

    def evaluations(self) -> list[EvaluationResult]:
        """List the evaluations recorded for this training run."""
        return self._client.evaluations.list(training_run_id=self.id)

    def add_dataset(self, dataset: Any) -> TrainingHandle:
        """Attach another dataset version to this training run."""
        unwrapped = _unwrap_datasets([dataset])
        assert unwrapped is not None
        self.training_run = self._client.training_runs.add_dataset(
            training_run_id=self.id,
            dataset=unwrapped[0],
        )
        return self

    def refresh(self) -> TrainingHandle:
        """Re-read this training run from the backend."""
        self.training_run = self._client.training_runs.get(self.id)
        return self

    def __repr__(self) -> str:
        return f"TrainingHandle(id={self.id!r})"


class EvaluationHandle(_Handle):
    """An evaluation result."""

    def __init__(self, client: SynthGraphClient, result: EvaluationResult) -> None:
        super().__init__(client)
        self.result = result

    @property
    def id(self) -> str:
        return self.result.id

    @property
    def metrics(self) -> dict[str, Any]:
        return self.result.metrics

    def refresh(self) -> EvaluationHandle:
        """Re-read this evaluation from the backend."""
        self.result = self._client.evaluations.get(self.id)
        return self

    def __repr__(self) -> str:
        return f"EvaluationHandle(id={self.id!r})"


def _default_generation_name(generator: Any) -> str:
    """Name a generation after its generator when the caller did not name it."""
    if isinstance(generator, Generator):
        return generator.name
    if isinstance(generator, str) and generator.strip():
        return generator.strip()
    return "generation"


def _unwrap_datasets(datasets: Any) -> list[Any] | None:
    """Accept a single dataset or a list of them wherever datasets are expected."""
    if datasets is None:
        return None
    if isinstance(datasets, (list, tuple)):
        return list(datasets)
    return [datasets]
