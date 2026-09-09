from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import Field

from .base import SynthGraphModel
from .reference import DataReference


class GenerationStatus(str, Enum):
    """Lifecycle state of a generation run.

    ``pending -> running -> completed | failed``. The backend is authoritative
    for transitions; the SDK does not enforce its own state machine (spec 20).
    """

    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"

    @property
    def is_terminal(self) -> bool:
        return self in {GenerationStatus.COMPLETED, GenerationStatus.FAILED}


class Generator(SynthGraphModel):
    """Information about the tool that produced a generation."""

    name: str = Field(min_length=1)
    version: str | None = None
    type: str | None = None


class Reproducibility(SynthGraphModel):
    """Information required to reproduce a generation.

    ``seed`` lives here rather than on the generation itself: it is
    reproducibility metadata, and this is the field the backend stores it in.
    """

    seed: int | None = Field(
        default=None,
        exclude_if=lambda value: value is None,
    )
    code_version: str | None = Field(
        default=None,
        exclude_if=lambda value: value is None,
    )
    environment: dict[str, Any] = Field(
        default_factory=dict,
        exclude_if=lambda value: not value,
    )
    configuration_hash: str | None = Field(
        default=None,
        exclude_if=lambda value: value is None,
    )


class GenerationRun(SynthGraphModel):
    """A single synthetic data generation execution."""

    id: str = Field(min_length=1)
    experiment_id: str = Field(min_length=1)
    name: str = Field(min_length=1)
    description: str | None = None

    generator: Generator
    parameters: dict[str, Any]

    reproducibility: Reproducibility

    inputs: list[DataReference] = Field(default_factory=list)
    outputs: list[DataReference] = Field(default_factory=list)

    status: GenerationStatus

    started_at: datetime | None = None
    completed_at: datetime | None = None
    created_at: datetime
    updated_at: datetime | None = None

    metadata: dict[str, Any] = Field(default_factory=dict)

    @property
    def seed(self) -> int | None:
        """Convenience accessor for ``reproducibility.seed``."""
        return self.reproducibility.seed

    @property
    def generator_name(self) -> str:
        return self.generator.name

    @property
    def generator_version(self) -> str | None:
        return self.generator.version
