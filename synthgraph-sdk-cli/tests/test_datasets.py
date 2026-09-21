from __future__ import annotations

import httpx
import pytest

from synthgraph.errors import SynthGraphValidationError

DATASET = {
    "id": "d1",
    "name": "rain_v1",
    "description": None,
    "metadata": {},
    "versions": [],
}

DATASET_VERSION = {
    "id": "dv1",
    "dataset_id": "d1",
    "version": "1",
    "uri": "s3://bucket/rain_v1",
    "format": "image",
}

ATTACHMENT = {"dataset_version_id": "dv1", "role": "output"}


def _route_full_flow(backend, *, dataset=DATASET, version=DATASET_VERSION, attachment=ATTACHMENT):
    backend.route("POST", "/datasets", httpx.Response(201, json=dataset))
    backend.route(
        "POST", f"/datasets/{dataset['id']}/versions", httpx.Response(201, json=version)
    )
    backend.route("POST", "/generations/g1/datasets", httpx.Response(201, json=attachment))


def test_create_makes_three_calls_in_order(client, backend):
    _route_full_flow(backend)

    version = client.datasets.create(
        generation_id="g1", name="rain_v1", uri="s3://bucket/rain_v1", format="image"
    )

    assert [(r.method, r.path) for r in backend.requests] == [
        ("POST", "/datasets"),
        ("POST", "/datasets/d1/versions"),
        ("POST", "/generations/g1/datasets"),
    ]
    assert backend.requests[0].body == {"name": "rain_v1"}
    assert backend.requests[1].body["uri"] == "s3://bucket/rain_v1"
    assert backend.requests[1].body["format"] == "image"
    assert backend.requests[2].body == {"datasetVersionId": "dv1", "role": "output"}
    assert version.id == "dv1"


def test_version_defaults_to_a_timestamp_when_not_given(client, backend):
    _route_full_flow(backend)

    client.datasets.create(generation_id="g1", name="rain_v1", uri="s3://bucket/rain_v1")

    version_body = backend.requests[1].body
    assert "version" in version_body
    # An ISO-8601 UTC timestamp, not something the caller supplied.
    assert "T" in version_body["version"]


def test_explicit_version_is_sent_as_given(client, backend):
    _route_full_flow(backend)

    client.datasets.create(
        generation_id="g1", name="rain_v1", uri="s3://bucket/rain_v1", version="1"
    )

    assert backend.requests[1].body["version"] == "1"


def test_dataset_id_reuses_an_existing_dataset_and_skips_creating_one(client, backend):
    backend.route(
        "POST", "/datasets/d1/versions", httpx.Response(201, json=DATASET_VERSION)
    )
    backend.route("POST", "/generations/g1/datasets", httpx.Response(201, json=ATTACHMENT))

    version = client.datasets.create(
        generation_id="g1",
        name="rain_v1",
        uri="s3://bucket/rain_v1",
        dataset_id="d1",
    )

    assert [(r.method, r.path) for r in backend.requests] == [
        ("POST", "/datasets/d1/versions"),
        ("POST", "/generations/g1/datasets"),
    ]
    assert version.id == "dv1"


def test_role_defaults_to_output(client, backend):
    _route_full_flow(backend)

    client.datasets.create(generation_id="g1", name="rain_v1", uri="s3://bucket/rain_v1")

    assert backend.requests[2].body["role"] == "output"


def test_role_is_passed_through_when_given(client, backend):
    _route_full_flow(backend, attachment={"dataset_version_id": "dv1", "role": "input"})

    client.datasets.create(
        generation_id="g1", name="rain_v1", uri="s3://bucket/rain_v1", role="input"
    )

    assert backend.requests[2].body["role"] == "input"


def test_optional_shape_metadata_is_passed_through(client, backend):
    _route_full_flow(backend)

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

    assert backend.requests[1].body == {
        "version": "1",
        "uri": "/data/rain_v1",
        "size": 1024,
        "checksum": "sha256:abc",
        "metadata": {"frames": 5000},
    }


def test_uri_is_required(client, backend):
    with pytest.raises(SynthGraphValidationError):
        client.datasets.create(generation_id="g1", name="rain_v1", uri="", dataset_id="d1")
    assert backend.requests == []


@pytest.mark.parametrize("size", [-1, 1.5, "1024", True])
def test_size_must_be_a_non_negative_integer(client, backend, size):
    with pytest.raises(SynthGraphValidationError):
        client.datasets.create(generation_id="g1", name="x", uri="/x", dataset_id="d1", size=size)
    assert backend.requests == []


def test_local_directory_is_referenced_not_walked(client, backend, tmp_path):
    """Recording a local dataset must not read or enumerate it (spec 6, 38)."""
    dataset_dir = tmp_path / "rain_v1"
    dataset_dir.mkdir()
    for index in range(5):
        (dataset_dir / f"frame_{index}.png").write_bytes(b"payload-bytes")

    _route_full_flow(backend)

    client.datasets.create(generation_id="g1", name="rain_v1", uri=str(dataset_dir))

    body = backend.requests[1].body
    assert body["uri"] == str(dataset_dir)
    assert "frame_0.png" not in str(body)
