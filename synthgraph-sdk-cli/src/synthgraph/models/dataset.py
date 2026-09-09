"""Dataset identity and its immutable versions (spec 21).

A ``Dataset`` is the logical identity. A ``DatasetVersion`` is an immutable
historical reference that a generation or training run points at, so the record
says which exact data was used rather than merely which dataset.

None of these carry dataset bytes.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import Field

from .base import SynthGraphModel


class DatasetVersion(SynthGraphModel):
    """An immutable version of a dataset."""

    id: str = Field(min_length=1)
    dataset_id: str | None = None
    version: str | None = None
    uri: str | None = None
    format: str | None = None
    size: int | None = Field(default=None, ge=0)
    checksum: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime | None = None


class Dataset(SynthGraphModel):
    """The logical identity of a dataset."""

    id: str = Field(min_length=1)
    name: str | None = None
    description: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)
    versions: list[DatasetVersion] = Field(default_factory=list)
    created_at: datetime | None = None
    updated_at: datetime | None = None

    @property
    def latest_version(self) -> DatasetVersion | None:
        return self.versions[-1] if self.versions else None
