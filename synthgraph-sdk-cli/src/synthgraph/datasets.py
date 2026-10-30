"""Dataset references attached to a generation (spec 6, 21).

Recording a dataset records *where it is and what it is*. The SDK never opens,
hashes-by-default, walks or uploads the data behind the URI. A hundred-gigabyte
render stays exactly where the researcher put it.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from .checksum import compute_local_digest
from .errors import SynthGraphValidationError
from .http import SynthGraphHTTPClient
from .models import Dataset, DatasetVersion
from .routes import Routes
from .scope import cross_project_error, project_of_generation
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
        compute_checksum: bool = False,
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
        knows them. The SDK does not compute them by default, because that
        would mean reading the dataset (spec 38).

        Pass ``compute_checksum=True`` to opt in: the SDK then hashes the file
        or directory at a *local* ``uri`` (see :mod:`synthgraph.checksum` for
        the algorithms) and fills in ``checksum`` and, if not given, ``size``.
        The cost is proportional to the data's size, and a remote URI is an
        error because the SDK will not download it. The hashing happens
        before anything is sent, so a failure never leaves a half-created
        dataset behind.
        """
        generation_id = require_identifier(generation_id, field="generation_id")

        if compute_checksum:
            if checksum is not None:
                raise SynthGraphValidationError(
                    "pass either checksum=... or compute_checksum=True, not both",
                    field="checksum",
                )
            digest = compute_local_digest(require_text(uri, field="uri"))
            checksum = digest.checksum
            if size is None:
                size = digest.size

        reusing_dataset = dataset_id is not None
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

        if reusing_dataset:
            # After local validation (invalid input still sends nothing) and before
            # the first write, so a rejected attach leaves no new version behind.
            self._assert_same_project(dataset_id, generation_id)

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

    def _assert_same_project(self, dataset_id: str, generation_id: str) -> None:
        """Refuse, before creating anything, to attach a dataset of another project.

        Creating a version and then having the attach rejected would leave a
        dataset version attached to nothing, and versions cannot be removed. A
        dataset with no recorded project is not checked here (the backend decides).
        """
        dataset = Dataset.model_validate(
            self._http.get(Routes.dataset(dataset_id), operation="datasets.get_dataset")
        )
        if dataset.project_id is None:
            return
        if project_of_generation(self._http, generation_id) != dataset.project_id:
            raise cross_project_error(
                "This dataset belongs to a different project. A dataset can only be "
                "used within one project. Nothing was created.",
                dataset_id=dataset_id,
            )


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
