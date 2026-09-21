"""Credential handling and the data boundary (spec 6, 14, 39, 57)."""

from __future__ import annotations

import json
import logging

import httpx
import pytest

from synthgraph import SynthGraphClient, SynthGraphConfig
from synthgraph.environment import git_metadata, scrub_remote_url
from synthgraph.errors import SynthGraphAuthenticationError, SynthGraphServerError

from .conftest import API_URL, generation_payload, project_payload

SECRET = "sg-live-SUPERSECRETKEY-9999"


def test_api_key_is_absent_from_config_repr():
    config = SynthGraphConfig(api_key=SECRET)
    assert SECRET not in repr(config)
    assert SECRET not in str(config)


def test_api_key_is_absent_from_client_repr(backend):
    with SynthGraphClient(
        api_key=SECRET, api_url=API_URL, transport=backend.transport
    ) as client:
        assert SECRET not in repr(client)


def test_api_key_is_absent_from_error_messages(backend):
    backend.route("GET", "/projects/p1", httpx.Response(401, json={"message": "Unauthorized"}))

    with SynthGraphClient(
        api_key=SECRET, api_url=API_URL, transport=backend.transport
    ) as client, pytest.raises(SynthGraphAuthenticationError) as excinfo:
        client.projects.get("p1")

    error = excinfo.value
    assert SECRET not in str(error)
    assert SECRET not in repr(error)
    assert SECRET not in json.dumps(error.details or {})


def test_api_key_is_absent_from_server_error_details(backend):
    backend.route(
        "GET",
        "/projects/p1",
        httpx.Response(500, json={"message": "boom", "trace": f"Bearer {SECRET}"}),
    )

    with SynthGraphClient(
        api_key=SECRET, api_url=API_URL, transport=backend.transport
    ) as client, pytest.raises(SynthGraphServerError) as excinfo:
        client.projects.get("p1")

    assert SECRET not in str(excinfo.value)


def test_api_key_is_absent_from_logs(backend, caplog):
    backend.route("GET", "/projects", httpx.Response(200, json=[project_payload()]))

    with caplog.at_level(logging.DEBUG), SynthGraphClient(
        api_key=SECRET, api_url=API_URL, transport=backend.transport
    ) as client:
        client.projects.list()

    assert SECRET not in caplog.text


def test_api_key_is_absent_from_serialized_models(backend):
    backend.route("GET", "/projects/p1", httpx.Response(200, json=project_payload()))

    with SynthGraphClient(
        api_key=SECRET, api_url=API_URL, transport=backend.transport
    ) as client:
        project = client.projects.get("p1")

    assert SECRET not in json.dumps(project.to_dict())


def test_api_key_is_absent_from_exported_manifests(backend):
    backend.route(
        "GET",
        "/generations/g1/reproduction-manifest",
        httpx.Response(200, json={"generation_id": "g1", "parameters": {}}),
    )

    with SynthGraphClient(
        api_key=SECRET, api_url=API_URL, transport=backend.transport
    ) as client:
        manifest = client.reproduction.get("g1")

    assert SECRET not in json.dumps(manifest.to_dict())


def test_api_key_is_only_ever_sent_as_a_bearer_header(backend):
    backend.route("GET", "/projects", httpx.Response(200, json=[]))

    with SynthGraphClient(
        api_key=SECRET, api_url=API_URL, transport=backend.transport
    ) as client:
        client.projects.list()

    request = backend.last()
    assert request.headers["authorization"] == f"Bearer {SECRET}"
    assert SECRET not in request.path
    assert SECRET not in json.dumps(request.query)
    assert request.body is None


def test_git_remote_credentials_are_stripped():
    assert scrub_remote_url("https://user:ghp_secret@github.com/lab/repo.git") == (
        "https://github.com/lab/repo.git"
    )
    assert "ghp_secret" not in scrub_remote_url("https://ghp_secret@github.com/lab/repo.git")


def test_git_metadata_never_raises_outside_a_repository(tmp_path):
    assert git_metadata(tmp_path) == {}


def test_git_metadata_never_includes_repository_contents(tmp_path):
    (tmp_path / "secrets.env").write_text("API_KEY=nope\n")
    assert "nope" not in json.dumps(git_metadata(tmp_path))


def test_dataset_bytes_are_never_uploaded(backend, tmp_path):
    """A referenced artifact is described, never transferred (spec 6)."""
    payload_bytes = b"SENSITIVE-RENDER-BYTES" * 100
    artifact = tmp_path / "scene.blend"
    artifact.write_bytes(payload_bytes)

    backend.route(
        "POST", "/experiments/e1/generations", httpx.Response(201, json=generation_payload())
    )
    backend.route("POST", "/datasets", httpx.Response(201, json={"id": "d1", "name": "out"}))
    backend.route(
        "POST", "/datasets/d1/versions", httpx.Response(201, json={"id": "dv1", "dataset_id": "d1"})
    )
    backend.route(
        "POST",
        "/generations/g1/datasets",
        httpx.Response(201, json={"dataset_version_id": "dv1", "role": "output"}),
    )

    with SynthGraphClient(
        api_key=SECRET, api_url=API_URL, transport=backend.transport
    ) as client:
        client.generations.create(
            experiment_id="e1",
            name="x",
            generator="blender",
            inputs=[{"id": "a1", "uri": str(artifact)}],
        )
        client.datasets.create(generation_id="g1", name="out", uri=str(artifact))

    for request in backend.requests:
        assert "SENSITIVE-RENDER-BYTES" not in json.dumps(request.body)
