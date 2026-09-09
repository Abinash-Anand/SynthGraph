"""Shared model configuration.

Every SynthGraph model is frozen, accepts either snake_case or camelCase from
the backend, and preserves fields the SDK does not know about yet so a backend
addition does not require an SDK release before researchers can see it
(spec 7.7).
"""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel

__all__ = ["SynthGraphModel"]


class SynthGraphModel(BaseModel):
    """Base class for SynthGraph domain models."""

    model_config = ConfigDict(
        frozen=True,
        populate_by_name=True,
        alias_generator=to_camel,
        extra="allow",
    )

    def to_dict(self) -> dict[str, Any]:
        """JSON-compatible snake_case representation of this model."""
        return self.model_dump(mode="json")
