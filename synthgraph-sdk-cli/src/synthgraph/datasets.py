"""Dataset references attached to a generation (spec 6, 21).

Recording a dataset records *where it is and what it is*. The SDK never opens,
hashes-by-default, walks or uploads the data behind the URI. A hundred-gigabyte
render stays exactly where the researcher put it.
"""

from __future__ import annotations

from typing import Any

from .errors import SynthGraphValidationError
from .http import SynthGraphHTTPClient
from .models import DatasetVersion
from .routes import Routes
from .serialization import compact, require_identifier, require_mapping, require_text


class DatasetsAPI:
    """API operations for dataset references."""

    def __init__(self, http: SynthGraphHTTPClient) -> None:
        self._http = http

    def create(
        self,
        *,
        generation_id: str,
        name: str,
        uri: str,
        version: str | None = None,
        format: str | None = None,
        size: int | None = None,
        checksum: str | None = None,
        role: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> DatasetVersion:
        """Record a dataset produced by (or used in) a generation.

        ``size`` and ``checksum`` are accepted when the researcher already
        knows them. The SDK does not compute them, because that would mean
        reading the dataset (spec 38).
        """
        generation_id = require_identifier(generation_id, field="generation_id")

        payload = compact(
            {
                "name": require_text(name, field="name"),
                "uri": require_text(uri, field="uri"),
                "version": version,
                "format": format,
                "size": _validate_size(size),
                "checksum": checksum,
                "role": role,
                "metadata": (
                    require_mapping(metadata, field="metadata") if metadata is not None else None
                ),
            }
        )

        data = self._http.post(
            Routes.generation_datasets(generation_id),
            json=payload,
            operation="datasets.create",
        )

        return DatasetVersion.model_validate(data)


def _validate_size(size: int | None) -> int | None:
    if size is None:
        return None
    if not isinstance(size, int) or isinstance(size, bool) or size < 0:
        raise SynthGraphValidationError(
            "size must be a non-negative integer number of bytes",
            field="size",
        )
    return size
