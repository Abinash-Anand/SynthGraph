from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class Generator(BaseModel):
    """Identifies the tool or system that generated synthetic data."""

    model_config = ConfigDict(frozen=True)

    name: str = Field(min_length=1)
    version: str | None = None
    type: str | None = None


class Reproducibility(BaseModel):
    """Metadata required to help reproduce a generation run."""

    model_config = ConfigDict(frozen=True)

    seed: int | None = None
    code_version: str | None = None
    environment: dict[str, Any] | None = None
    configuration_hash: str | None = None


class GenerationStatus(str, Enum):
    """Lifecycle status of a generation run."""

    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class GenerationRun(BaseModel):
    """A single execution of a synthetic-data generation process."""

    model_config = ConfigDict(frozen=True)

    id: str
    experiment_id: str

    name: str = Field(min_length=1)
    description: str | None = None

    generator: Generator
    parameters: dict[str, Any]
    reproducibility: Reproducibility

    inputs: list[str] = Field(default_factory=list)
    outputs: list[str] = Field(default_factory=list)

    status: GenerationStatus

    started_at: datetime | None = None
    completed_at: datetime | None = None
    created_at: datetime

    metadata: dict[str, Any] = Field(default_factory=dict)