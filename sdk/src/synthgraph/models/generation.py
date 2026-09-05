from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from .reference import DataReference


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

    seed: int | None = None
    code_version: str | None = None
    environment: dict[str, Any] = Field(default_factory=dict)
    configuration_hash: str | None = None


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

    inputs: list[DataReference] = Field(default_factory=list)
    outputs: list[DataReference] = Field(default_factory=list)

    status: GenerationStatus

    started_at: datetime | None = None
    completed_at: datetime | None = None
    created_at: datetime

    metadata: dict[str, Any] = Field(default_factory=dict)