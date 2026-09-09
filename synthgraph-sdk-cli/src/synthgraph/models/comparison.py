"""Generation comparison result (spec 30).

Comparison is an operation over existing generations, not a stored entity. The
comparison itself is performed by the backend; the SDK carries the result and
the CLI presents it. Neither recomputes it, because that would risk two
different answers to a scientific question.

``to_dict()`` returns the backend payload verbatim for the same reason the
reproduction manifest does.
"""

from __future__ import annotations

import copy
from collections.abc import Mapping
from typing import Any

from pydantic import Field, PrivateAttr

from .base import SynthGraphModel


class ComparisonResult(SynthGraphModel):
    """The backend's answer to "how do these generations differ?"."""

    generation_ids: list[str] = Field(default_factory=list)
    generations: list[dict[str, Any]] = Field(default_factory=list)
    #: Shape is backend-defined; commonly a per-field mapping of differences.
    differences: Any = None
    summary: Any = None

    _payload: dict[str, Any] = PrivateAttr(default_factory=dict)

    @classmethod
    def from_payload(cls, payload: Mapping[str, Any]) -> ComparisonResult:
        result = cls.model_validate(dict(payload))
        result._payload = copy.deepcopy(dict(payload))
        return result

    def to_dict(self) -> dict[str, Any]:
        """The comparison exactly as the backend produced it."""
        if self._payload:
            return copy.deepcopy(self._payload)
        return self.model_dump(mode="json", exclude_none=True)
