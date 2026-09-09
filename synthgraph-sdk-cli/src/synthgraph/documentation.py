"""Generated experiment documentation (spec 28)."""

from __future__ import annotations

from .http import SynthGraphHTTPClient
from .routes import Routes
from .serialization import require_identifier


class DocumentationAPI:
    """API operations for generated Markdown documentation."""

    def __init__(self, http: SynthGraphHTTPClient) -> None:
        self._http = http

    def get(self, generation_id: str) -> str:
        """Retrieve backend-generated Markdown documentation for a generation.

        Returned as a plain string: print it, write it to a file, or feed it to
        whatever the researcher's lab already uses. The SDK does not render it.
        """
        generation_id = require_identifier(generation_id, field="generation_id")

        return self._http.get_text(
            Routes.generation_documentation(generation_id),
            operation="documentation.get",
        )
