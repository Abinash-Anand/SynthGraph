from __future__ import annotations

import httpx
import pytest

from synthgraph.errors import SynthGraphValidationError

ASSET = {
    "id": "a1",
    "name": "rain_render",
    "type": "video",
    "description": None,
    "metadata": {},
    "versions": [],
}

ASSET_VERSION = {
    "id": "av1",
    "asset_id": "a1",
    "version": "1",
    "uri": "s3://bucket/rain_render.mp4",
}

ATTACHMENT = {"assetVersionId": "av1", "role": "output"}


def _route_full_flow(backend, *, asset=ASSET, version=ASSET_VERSION, attachment=ATTACHMENT):
    backend.route("POST", "/assets", httpx.Response(201, json=asset))
    backend.route(
        "POST", f"/assets/{asset['id']}/versions", httpx.Response(201, json=version)
    )
    backend.route("POST", "/generations/g1/assets", httpx.Response(201, json=attachment))


def test_create_makes_three_calls_in_order(client, backend):
    _route_full_flow(backend)

    version = client.assets.create(
        generation_id="g1",
        name="rain_render",
        uri="s3://bucket/rain_render.mp4",
        type="video",
    )

    assert [(r.method, r.path) for r in backend.requests] == [
        ("POST", "/assets"),
        ("POST", "/assets/a1/versions"),
        ("POST", "/generations/g1/assets"),
    ]
    assert backend.requests[0].body == {"name": "rain_render", "type": "video"}
    assert backend.requests[1].body["uri"] == "s3://bucket/rain_render.mp4"
    assert backend.requests[2].body == {"assetVersionId": "av1", "role": "output"}
    assert version.id == "av1"


def test_type_is_omitted_when_not_given(client, backend):
    _route_full_flow(backend)

    client.assets.create(generation_id="g1", name="rain_render", uri="s3://bucket/x.mp4")

    assert backend.requests[0].body == {"name": "rain_render"}


def test_version_payload_never_has_a_format_field(client, backend):
    """AssetVersion has no ``format`` field, unlike DatasetVersion."""
    _route_full_flow(backend)

    client.assets.create(
        generation_id="g1",
        name="rain_render",
        uri="s3://bucket/rain_render.mp4",
        version="1",
    )

    assert "format" not in backend.requests[1].body


def test_version_defaults_to_a_timestamp_when_not_given(client, backend):
    _route_full_flow(backend)

    client.assets.create(generation_id="g1", name="rain_render", uri="s3://bucket/x.mp4")

    version_body = backend.requests[1].body
    assert "version" in version_body
    # An ISO-8601 UTC timestamp, not something the caller supplied.
    assert "T" in version_body["version"]


def test_explicit_version_is_sent_as_given(client, backend):
    _route_full_flow(backend)

    client.assets.create(
        generation_id="g1", name="rain_render", uri="s3://bucket/x.mp4", version="1"
    )

    assert backend.requests[1].body["version"] == "1"


def test_asset_id_reuses_an_existing_asset_and_skips_creating_one(client, backend):
    backend.route(
        "POST", "/assets/a1/versions", httpx.Response(201, json=ASSET_VERSION)
    )
    backend.route("POST", "/generations/g1/assets", httpx.Response(201, json=ATTACHMENT))

    version = client.assets.create(
        generation_id="g1",
        name="rain_render",
        uri="s3://bucket/rain_render.mp4",
        asset_id="a1",
    )

    assert [(r.method, r.path) for r in backend.requests] == [
        ("POST", "/assets/a1/versions"),
        ("POST", "/generations/g1/assets"),
    ]
    assert version.id == "av1"


def test_role_defaults_to_output(client, backend):
    _route_full_flow(backend)

    client.assets.create(generation_id="g1", name="rain_render", uri="s3://bucket/x.mp4")

    assert backend.requests[2].body["role"] == "output"


def test_role_is_passed_through_when_given(client, backend):
    _route_full_flow(backend, attachment={"assetVersionId": "av1", "role": "input"})

    client.assets.create(
        generation_id="g1", name="rain_render", uri="s3://bucket/x.mp4", role="input"
    )

    assert backend.requests[2].body["role"] == "input"


def test_optional_shape_metadata_is_passed_through(client, backend):
    _route_full_flow(backend)

    client.assets.create(
        generation_id="g1",
        name="rain_render",
        uri="/data/rain_render.mp4",
        version="1",
        size=1024,
        checksum="sha256:abc",
        role="output",
        metadata={"frames": 5000},
    )

    assert backend.requests[1].body == {
        "version": "1",
        "uri": "/data/rain_render.mp4",
        "size": 1024,
        "checksum": "sha256:abc",
        "metadata": {"frames": 5000},
    }


def test_uri_is_required(client, backend):
    with pytest.raises(SynthGraphValidationError):
        client.assets.create(generation_id="g1", name="rain_render", uri="", asset_id="a1")
    assert backend.requests == []


@pytest.mark.parametrize("size", [-1, 1.5, "1024", True])
def test_size_must_be_a_non_negative_integer(client, backend, size):
    with pytest.raises(SynthGraphValidationError):
        client.assets.create(generation_id="g1", name="x", uri="/x", asset_id="a1", size=size)
    assert backend.requests == []


def test_local_file_is_referenced_not_read(client, backend, tmp_path):
    """Recording a local asset must not open or hash it (spec 22, 38)."""
    video = tmp_path / "rain_render.mp4"
    video.write_bytes(b"payload-bytes")

    _route_full_flow(backend)

    client.assets.create(generation_id="g1", name="rain_render", uri=str(video))

    body = backend.requests[1].body
    assert body["uri"] == str(video)
    assert "payload-bytes" not in str(body)
