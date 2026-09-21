"""Training run provenance (spec 23).

SynthGraph records that a training run happened and what went into it. It does
not start, control or observe the actual training process - the researcher
keeps running their own training code.

Status is a plain string rather than an enum: the backend's training-run
lifecycle vocabulary is an unverified contract item (spec 63).
"""

from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import Field, model_validator

from .base import SynthGraphModel
from .dataset import DatasetVersion


class TrainingRun(SynthGraphModel):
    """A model training execution recorded against an experiment."""

    id: str = Field(min_length=1)
    experiment_id: str | None = None
    name: str | None = None
    description: str | None = None

    model: str | None = None
    framework: str | None = None
    framework_version: str | None = None

    config: dict[str, Any] = Field(default_factory=dict)
    metadata: dict[str, Any] = Field(default_factory=dict)

    @model_validator(mode="before")
    @classmethod
    def _lift_trainer_and_parameters(cls, data: Any) -> Any:
        """Read back the wire's nested ``trainer``/``parameters`` onto the
        ergonomic flat fields ``training_runs.create()`` already accepts them
        as (CONTRACT.md 2.14) - without this, every ``TrainingRun`` parsed
        from a real backend response has ``model``/``framework``/
        ``framework_version``/``config`` permanently empty, since the wire
        never carries those flat names.
        """
        if not isinstance(data, dict):
            return data

        data = dict(data)
        trainer = data.get("trainer")
        if isinstance(trainer, dict):
            data.setdefault("model", trainer.get("name"))
            data.setdefault("framework", trainer.get("type"))
            data.setdefault("framework_version", trainer.get("version"))

        parameters = data.get("parameters")
        if isinstance(parameters, dict):
            data.setdefault("config", parameters)

        return data

    # None means this SDK version never reported on it - not the same thing
    # as a report that found nothing attached. See integration_session.py
    # and CONTRACT.md 2.27.
    capture_status: dict[str, Any] | None = None

    datasets: list[DatasetVersion] = Field(default_factory=list)

    status: str | None = None
    started_at: datetime | None = None
    completed_at: datetime | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None


class TrainingRunMetric(SynthGraphModel):
    """A single metric observation recorded at a step during training.

    Unlike :class:`~synthgraph.models.evaluation.EvaluationResult` (one final
    score against an exact dataset version), this tracks how a metric evolves
    *over the course of* training - one row per (training run, step). Metrics
    stay a flexible mapping; the SDK does not know what "loss" or "mAP" means.
    """

    id: str = Field(min_length=1)
    training_run_id: str | None = None
    step: int | None = None
    metrics: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime | None = None
