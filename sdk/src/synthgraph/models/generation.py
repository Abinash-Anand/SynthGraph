from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from .reference import AssetReference, DataReference, DatasetReference


class GenerationStatus(str, Enum):
    """Lifecycle state of a generation run."""

    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class Generator(BaseModel):
    """Information about the tool that produced a generation."""

    model_config = ConfigDict(frozen=True)

    name: str = Field(min_length=1)
    version: str | None = None
    type: str | None = None


class Reproducibility(BaseModel):
    """Information required to reproduce a generation."""

    model_config = ConfigDict(frozen=True)

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


class GenerationRun(BaseModel):
    """A single synthetic data generation execution."""

    model_config = ConfigDict(frozen=True)

    id: str = Field(min_length=1)
    experiment_id: str = Field(min_length=1)
    name: str = Field(min_length=1)
    description: str | None = None

    generator: Generator
    parameters: dict[str, Any]

    reproducibility: Reproducibility

    inputs: list[AssetReference | DatasetReference | DataReference] = Field(
        default_factory=list
    )
    outputs: list[AssetReference | DatasetReference | DataReference] = Field(
        default_factory=list
    )

    status: GenerationStatus

    started_at: datetime | None = None
    completed_at: datetime | None = None
    created_at: datetime

    metadata: dict[str, Any] = Field(default_factory=dict)