"""Reproduction manifest retrieval (spec 26, 27)."""

from __future__ import annotations

from .http import SynthGraphHTTPClient
from .models import ReproductionManifest
from .routes import Routes
from .serialization import require_identifier


class ReproductionAPI:
    """API operations for reproduction manifests."""

    def __init__(self, http: SynthGraphHTTPClient) -> None:
        self._http = http

    def get(self, generation_id: str) -> ReproductionManifest:
        """Retrieve the reproduction manifest for a generation.

        The manifest describes what would be needed to reconstruct the
        experiment. It is a record, not an executable plan, and it carries no
        dataset bytes and no credentials.
        """
        generation_id = require_identifier(generation_id, field="generation_id")

        data = self._http.get(
            Routes.generation_manifest(generation_id),
            operation="reproduction.get",
        )

        return ReproductionManifest.from_payload(data)
