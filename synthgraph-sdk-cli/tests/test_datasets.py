from __future__ import annotations

import httpx
import pytest

from synthgraph.errors import SynthGraphValidationError

DATASET_VERSION = {
    "id": "dv1",
    "dataset_id": "d1",
    "version": "1",
    "uri": "s3://bucket/rain_v1",
    "format": "image",
}


def test_create_posts_under_the_generation(client, backend):
    backend.route(
        "POST", "/generations/g1/datasets", httpx.Response(201, json=DATASET_VERSION)
    )

    version = client.datasets.create(
        generation_id="g1", name="rain_v1", uri="s3://bucket/rain_v1", format="image"
    )

    assert backend.last().path == "/generations/g1/datasets"
    assert backend.last().body == {
        "name": "rain_v1",
        "uri": "s3://bucket/rain_v1",
        "format": "image",
    }
    assert version.id == "dv1"


def test_optional_shape_metadata_is_passed_through(client, backend):
    backend.route("POST", "/generations/g1/datasets", httpx.Response(201, json=DATASET_VERSION))

    client.datasets.create(
        generation_id="g1",
        name="rain_v1",
        uri="/data/rain_v1",
        version="1",
        size=1024,
        checksum="sha256:abc",
        role="output",
        metadata={"frames": 5000},
    )

    assert backend.last().body == {
        "name": "rain_v1",
        "uri": "/data/rain_v1",
        "version": "1",
        "size": 1024,
        "checksum": "sha256:abc",
        "role": "output",
        "metadata": {"frames": 5000},
    }


def test_uri_is_required(client, backend):
    with pytest.raises(SynthGraphValidationError):
        client.datasets.create(generation_id="g1", name="rain_v1", uri="")
    assert backend.requests == []


@pytest.mark.parametrize("size", [-1, 1.5, "1024", True])
def test_size_must_be_a_non_negative_integer(client, backend, size):
    with pytest.raises(SynthGraphValidationError):
        client.datasets.create(generation_id="g1", name="x", uri="/x", size=size)
    assert backend.requests == []


def test_local_directory_is_referenced_not_walked(client, backend, tmp_path):
    """Recording a local dataset must not read or enumerate it (spec 6, 38)."""
    dataset_dir = tmp_path / "rain_v1"
    dataset_dir.mkdir()
    for index in range(5):
        (dataset_dir / f"frame_{index}.png").write_bytes(b"payload-bytes")

    backend.route("POST", "/generations/g1/datasets", httpx.Response(201, json=DATASET_VERSION))

    client.datasets.create(generation_id="g1", name="rain_v1", uri=str(dataset_dir))

    body = backend.last().body
    assert body == {"name": "rain_v1", "uri": str(dataset_dir)}
    assert "frame_0.png" not in str(body)
