from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class DataReference(BaseModel):
    """Reference to data managed outside or inside SynthGraph."""

    model_config = ConfigDict(frozen=True)

    id: str = Field(min_length=1)
    uri: str | None = Field(default=None, min_length=1)
    name: str | None = Field(default=None, min_length=1)
    metadata: dict[str, Any] = Field(default_factory=dict)


class AssetReference(DataReference):
    """Reference to a source or generated asset."""

    type: str | None = None


class DatasetReference(DataReference):
    """Reference to a source or generated dataset."""

    format: str | None = None
    size: int | None = Field(default=None, ge=0)