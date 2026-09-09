"""Generation comparison (spec 30).

Comparison is an operation, not a stored resource, and the comparison itself is
the backend's answer. The SDK carries it; it does not recompute or "improve" it.
"""

from __future__ import annotations

from collections.abc import Sequence

from .errors import SynthGraphValidationError
from .http import SynthGraphHTTPClient
from .models import ComparisonResult
from .routes import Routes
from .serialization import require_identifier, require_sequence


class ComparisonAPI:
    """API operations for comparing generations."""

    def __init__(self, http: SynthGraphHTTPClient) -> None:
        self._http = http

    def compare(self, generation_ids: Sequence[str]) -> ComparisonResult:
        """Compare two or more generation runs."""
        ids = require_sequence(generation_ids, field="generation_ids")
        if len(ids) < 2:
            raise SynthGraphValidationError(
                "comparison needs at least two generation IDs",
                field="generation_ids",
            )

        normalized = [
            require_identifier(value, field=f"generation_ids[{index}]")
            for index, value in enumerate(ids)
        ]

        data = self._http.post(
            Routes.generations_compare(),
            json={"generation_ids": normalized},
            operation="generations.compare",
        )

        return ComparisonResult.from_payload(data)
