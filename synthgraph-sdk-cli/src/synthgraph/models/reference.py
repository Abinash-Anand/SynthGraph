"""References to data and assets that stay under researcher control.

A reference is metadata: identity, location, version, shape. The SDK never
transfers the bytes behind it (spec 6, 21, 22).
"""

from __future__ import annotations

from typing import Any

from pydantic import Field

from .base import SynthGraphModel


class DataReference(SynthGraphModel):
    """Reference to data managed outside or inside SynthGraph."""

    id: str = Field(min_length=1)
    uri: str = Field(min_length=1)
    name: str = Field(min_length=1)
    metadata: dict[str, Any] = Field(default_factory=dict)


class AssetReference(DataReference):
    """Reference to a source or generated asset."""

    type: str | None = None
    version: str | None = None
    checksum: str | None = None


class DatasetReference(DataReference):
    """Reference to a source or generated dataset."""

    format: str | None = None
    size: int | None = Field(default=None, ge=0)
    version: str | None = None
    checksum: str | None = None
