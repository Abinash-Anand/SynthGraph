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

from pydantic import Field

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
