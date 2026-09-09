"""Reproduction manifest (spec 26, 27).

The manifest is a record of provenance and reconstruction requirements. It is
not a command that runs the researcher's tools, and it never claims guaranteed
reproducibility.

The exact manifest schema is produced by the backend and is not frozen in the
SDK. The typed fields below are conveniences; ``to_dict()`` returns the
backend's payload **verbatim**, so exporting a manifest never drops or reorders
information the SDK did not happen to know about.
"""

from __future__ import annotations

import copy
from collections.abc import Mapping
from datetime import datetime
from typing import Any

from pydantic import Field, PrivateAttr

from .base import SynthGraphModel


class ReproductionManifest(SynthGraphModel):
    """A reproduction manifest for a single generation."""

    generation_id: str | None = None
    experiment_id: str | None = None
    project_id: str | None = None

    generator: dict[str, Any] | None = None
    parameters: dict[str, Any] = Field(default_factory=dict)
    reproducibility: dict[str, Any] = Field(default_factory=dict)

    inputs: list[Any] = Field(default_factory=list)
    outputs: list[Any] = Field(default_factory=list)

    #: Information the backend knows it cannot supply, e.g. external tooling.
    missing: list[Any] = Field(default_factory=list)
    warnings: list[Any] = Field(default_factory=list)

    generated_at: datetime | None = None

    _payload: dict[str, Any] = PrivateAttr(default_factory=dict)

    @classmethod
    def from_payload(cls, payload: Mapping[str, Any]) -> ReproductionManifest:
        """Build a manifest, keeping the backend payload intact for export."""
        manifest = cls.model_validate(dict(payload))
        manifest._payload = copy.deepcopy(dict(payload))
        return manifest

    def to_dict(self) -> dict[str, Any]:
        """The manifest exactly as the backend produced it."""
        if self._payload:
            return copy.deepcopy(self._payload)
        return self.model_dump(mode="json", exclude_none=True)

    @property
    def is_complete(self) -> bool:
        """True only when the backend reported nothing missing.

        A manifest with missing external dependencies is still a valid record;
        it just cannot promise reproducibility (spec 26).
        """
        return not self.missing
