"""Media/asset references attached to a generation (spec 22).

Recording an asset records *where it is and what it is* - a rendered video, a
plot, a checkpoint. Like datasets, assets are referenced, never uploaded: the
SDK never opens, hashes-by-default or walks whatever the URI points at.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from .errors import SynthGraphValidationError
from .http import SynthGraphHTTPClient
from .models import Asset, AssetVersion
from .routes import Routes
from .serialization import compact, require_identifier, require_mapping, require_text


class AssetsAPI:
    """API operations for asset references."""

    def __init__(self, http: SynthGraphHTTPClient) -> None:
        self._http = http

    def create(
        self,
        *,
        generation_id: str,
        name: str,
        uri: str,
        asset_id: str | None = None,
        type: str | None = None,
        version: str | None = None,
        checksum: str | None = None,
        size: int | None = None,
        role: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> AssetVersion:
        """Record a media/asset reference attached to a generation.

        Mirrors ``DatasetsAPI.create()``'s three-step flow: create the
        logical ``Asset`` (unless ``asset_id=`` reuses an existing one) ->
        create the immutable ``AssetVersion`` (``version`` defaults to a UTC
        timestamp when omitted) -> attach the version to the generation
        (``role`` defaults to ``"output"``). The SDK never opens,
        hashes-by-default or uploads whatever the URI points at - same as
        datasets.

        ``type`` is a free-form label on the logical ``Asset`` (e.g.
        "video", "plot", "checkpoint") - it is never validated by the SDK,
        matching how other free-form type fields work elsewhere (e.g.
        ``Generator.type``). Unlike ``DatasetsAPI.create()``, there is no
        ``format`` parameter: ``AssetVersion`` has no ``format`` field.
        """
        generation_id = require_identifier(generation_id, field="generation_id")

        if asset_id is not None:
            asset_id = require_identifier(asset_id, field="asset_id")
        else:
            asset_payload = compact(
                {
                    "name": require_text(name, field="name"),
                    "type": type,
                }
            )
            asset_data = self._http.post(
                Routes.assets(),
                json=asset_payload,
                operation="assets.create_asset",
            )
            asset_id = Asset.model_validate(asset_data).id

        version_payload = compact(
            {
                "version": version or _default_version(),
                "uri": require_text(uri, field="uri"),
                "size": _validate_size(size),
                "checksum": checksum,
                "metadata": (
                    require_mapping(metadata, field="metadata") if metadata is not None else None
                ),
            }
        )

        version_data = self._http.post(
            Routes.asset_versions(asset_id),
            json=version_payload,
            operation="assets.create_version",
        )
        asset_version = AssetVersion.model_validate(version_data)

        self._http.post(
            Routes.generation_assets(generation_id),
            json={"assetVersionId": asset_version.id, "role": role or "output"},
            operation="assets.attach_to_generation",
        )

        return asset_version


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
