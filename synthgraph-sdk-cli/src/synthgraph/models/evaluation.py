"""Evaluation result provenance (spec 24).

Metrics stay a flexible mapping. The SDK does not define a field per metric -
mAP today, something else next quarter.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import Field

from .base import SynthGraphModel


class EvaluationResult(SynthGraphModel):
    """Metrics produced by evaluating a training run."""

    id: str = Field(min_length=1)
    training_run_id: str | None = None
    #: The exact dataset version the model was evaluated against.
    dataset_version_id: str | None = None
    name: str | None = None
    metrics: dict[str, Any] = Field(default_factory=dict)
    metadata: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime | None = None
    updated_at: datetime | None = None
