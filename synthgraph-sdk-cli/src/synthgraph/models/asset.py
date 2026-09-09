"""Asset identity and its immutable versions (spec 22).

Assets are reusable generator inputs: models, textures, scenes, meshes. Like
datasets they are referenced, never uploaded.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import Field

from .base import SynthGraphModel


class AssetVersion(SynthGraphModel):
    """An immutable version of an asset."""

    id: str = Field(min_length=1)
    asset_id: str | None = None
    version: str | None = None
    uri: str | None = None
    checksum: str | None = None
    size: int | None = Field(default=None, ge=0)
    metadata: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime | None = None


class Asset(SynthGraphModel):
    """The logical identity of an asset."""

    id: str = Field(min_length=1)
    name: str | None = None
    type: str | None = None
    description: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)
    versions: list[AssetVersion] = Field(default_factory=list)
    created_at: datetime | None = None
    updated_at: datetime | None = None
