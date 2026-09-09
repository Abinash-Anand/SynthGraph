from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import Field

from .base import SynthGraphModel


class Experiment(SynthGraphModel):
    """A research experiment belonging to a SynthGraph project."""

    id: str
    project_id: str
    name: str = Field(min_length=1)
    description: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime
    updated_at: datetime | None = None
