"""Dataset references attached to a generation (spec 6, 21).

Recording a dataset records *where it is and what it is*. The SDK never opens,
hashes-by-default, walks or uploads the data behind the URI. A hundred-gigabyte
render stays exactly where the researcher put it.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from .errors import SynthGraphValidationError
from .http import SynthGraphHTTPClient
from .models import Dataset, DatasetVersion
from .routes import Routes
from .serialization import compact, require_identifier, require_mapping, require_text

#: Aliases so annotations inside the class body are not shadowed by
#: ``DatasetsAPI.list``.
DatasetList = list[Dataset]
DatasetVersionList = list[DatasetVersion]


class DatasetsAPI:
    """API operations for dataset references."""

    def __init__(self, http: SynthGraphHTTPClient) -> None:
        self._http = http

    def get(self, dataset_id: str) -> Dataset:
        """Retrieve a dataset's logical identity by ID."""
        dataset_id = require_identifier(dataset_id, field="dataset_id")

        data = self._http.get(Routes.dataset(dataset_id), operation="datasets.get")

        return Dataset.model_validate(data)

    def list(self) -> DatasetList:
        """List every dataset the caller owns."""
        data = self._http.get_list(Routes.datasets(), operation="datasets.list")

        return [Dataset.model_validate(item) for item in data]

    def get_version(self, dataset_version_id: str) -> DatasetVersion:
        """Retrieve one immutable dataset version by ID."""
        dataset_version_id = require_identifier(
            dataset_version_id, field="dataset_version_id"
        )

        data = self._http.get(
            Routes.dataset_version(dataset_version_id),
            operation="datasets.get_version",
        )

        return DatasetVersion.model_validate(data)

    def list_versions(self, dataset_id: str) -> DatasetVersionList:
        """List the versions recorded for a dataset."""
        dataset_id = require_identifier(dataset_id, field="dataset_id")

        data = self._http.get_list(
            Routes.dataset_versions(dataset_id),
            operation="datasets.list_versions",
        )

        return [DatasetVersion.model_validate(item) for item in data]

    def create(
        self,
        *,
        generation_id: str,
        name: str,
        uri: str,
        dataset_id: str | None = None,
        version: str | None = None,
        format: str | None = None,
        size: int | None = None,
        checksum: str | None = None,
        role: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> DatasetVersion:
        """Record a dataset produced by (or used in) a generation.

        The backend models a dataset as a logical ``Dataset`` (identity) with
        immutable ``DatasetVersion`` records hanging off it. This method
        bridges that with a single call: it creates a new ``Dataset`` (named
        ``name``) unless ``dataset_id`` names an existing one to reuse, adds a
        version to it, and attaches that version to the generation.

        ``size`` and ``checksum`` are accepted when the researcher already
        knows them. The SDK does not compute them, because that would mean
        reading the dataset (spec 38).
        """
        generation_id = require_identifier(generation_id, field="generation_id")

        if dataset_id is not None:
            dataset_id = require_identifier(dataset_id, field="dataset_id")
        else:
            dataset_payload = compact({"name": require_text(name, field="name")})
            dataset_data = self._http.post(
                Routes.datasets(),
                json=dataset_payload,
                operation="datasets.create_dataset",
            )
            dataset_id = Dataset.model_validate(dataset_data).id

        version_payload = compact(
            {
                "version": version or _default_version(),
                "uri": require_text(uri, field="uri"),
                "format": format,
                "size": _validate_size(size),
                "checksum": checksum,
                "metadata": (
                    require_mapping(metadata, field="metadata") if metadata is not None else None
                ),
            }
        )

        version_data = self._http.post(
            Routes.dataset_versions(dataset_id),
            json=version_payload,
            operation="datasets.create_version",
        )
        dataset_version = DatasetVersion.model_validate(version_data)

        self._http.post(
            Routes.generation_datasets(generation_id),
            json={"datasetVersionId": dataset_version.id, "role": role or "output"},
            operation="datasets.attach_to_generation",
        )

        return dataset_version


def _default_version() -> str:
    """A unique version label when the caller does not supply one.

    An ISO-8601 UTC timestamp is always unique and needs no extra network
    round trip to check for collisions.
    """
    return datetime.now(timezone.utc).isoformat()


def _validate_size(size: int | None) -> int | None:
    if size is None:
        return None
    if not isinstance(size, int) or isinstance(size, bool) or size < 0:
        raise SynthGraphValidationError(
            "size must be a non-negative integer number of bytes",
            field="size",
        )
    return size
