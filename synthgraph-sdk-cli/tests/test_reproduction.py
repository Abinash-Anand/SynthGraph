from __future__ import annotations

import httpx
import pytest

from synthgraph.errors import SynthGraphNotFoundError

MANIFEST = {
    "generation_id": "g1",
    "experiment_id": "e1",
    "generator": {"name": "blender", "version": "4.2"},
    "parameters": {"weather": "rain", "occlusion": 0.3},
    "reproducibility": {"seed": 42, "code_version": "deadbeef"},
    "inputs": [{"id": "d1", "uri": "s3://bucket/scenes"}],
    "outputs": [{"id": "dv1", "uri": "s3://bucket/rain_v1"}],
    "missing": [],
}


def test_manifest_uses_the_backend_route(client, backend):
    backend.route(
        "GET", "/generations/g1/reproduction-manifest", httpx.Response(200, json=MANIFEST)
    )

    manifest = client.reproduction.get("g1")

    assert backend.last().path == "/generations/g1/reproduction-manifest"
    assert manifest.generation_id == "g1"
    assert manifest.parameters["weather"] == "rain"


def test_manifest_export_is_verbatim(client, backend):
    """Exporting must not drop fields the SDK does not model yet."""
    payload = dict(MANIFEST, backend_only_section={"pipeline": "v3"})
    backend.route(
        "GET", "/generations/g1/reproduction-manifest", httpx.Response(200, json=payload)
    )

    assert client.reproduction.get("g1").to_dict() == payload


def test_manifest_export_is_a_copy(client, backend):
    backend.route(
        "GET", "/generations/g1/reproduction-manifest", httpx.Response(200, json=MANIFEST)
    )

    manifest = client.reproduction.get("g1")
    manifest.to_dict()["parameters"]["weather"] = "snow"

    assert manifest.to_dict()["parameters"]["weather"] == "rain"


def test_manifest_reports_incompleteness_rather_than_promising_reproducibility(client, backend):
    payload = dict(MANIFEST, missing=[{"kind": "asset", "id": "car.blend"}])
    backend.route(
        "GET", "/generations/g1/reproduction-manifest", httpx.Response(200, json=payload)
    )

    manifest = client.reproduction.get("g1")

    assert manifest.is_complete is False
    assert len(manifest.missing) == 1


def test_complete_manifest(client, backend):
    backend.route(
        "GET", "/generations/g1/reproduction-manifest", httpx.Response(200, json=MANIFEST)
    )
    assert client.reproduction.get("g1").is_complete is True


def test_missing_generation_raises_not_found(client, backend):
    backend.route(
        "GET",
        "/generations/nope/reproduction-manifest",
        httpx.Response(404, json={"message": "Generation not found"}),
    )
    with pytest.raises(SynthGraphNotFoundError):
        client.reproduction.get("nope")
