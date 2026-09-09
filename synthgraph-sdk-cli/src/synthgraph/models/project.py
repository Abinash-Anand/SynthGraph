from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import Field

from .base import SynthGraphModel


class Project(SynthGraphModel):
    """A top-level SynthGraph research project."""

    id: str
    name: str = Field(min_length=1)
    description: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime
    updated_at: datetime | None = None
