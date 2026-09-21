from __future__ import annotations

import json

import httpx
import pytest

from synthgraph.errors import SynthGraphValidationError
from synthgraph.models import DatasetReference, GenerationStatus, Generator, Reproducibility

from .conftest import generation_payload


def _created(backend):
    backend.route(
        "POST", "/experiments/e1/generations", httpx.Response(201, json=generation_payload())
    )


def test_create_builds_the_canonical_payload(client, backend):
    _created(backend)

    client.generations.create(
        experiment_id="e1",
        name="rain_pass",
        generator="blender",
        generator_version="4.2",
        parameters={"weather": "rain", "occlusion": 0.3},
        seed=42,
        capture_environment=False,
    )

    assert backend.last().body == {
        "name": "rain_pass",
        "generator": {"name": "blender", "version": "4.2"},
        "parameters": {"weather": "rain", "occlusion": 0.3},
        "reproducibility": {"seed": 42},
        "inputs": [],
        "outputs": [],
    }


def test_create_accepts_a_generator_model(client, backend):
    _created(backend)

    client.generations.create(
        experiment_id="e1",
        name="rain_pass",
        generator=Generator(name="unity", version="2022.3", type="simulator"),
        parameters={},
        reproducibility=Reproducibility(seed=7, code_version="abc123"),
        capture_environment=False,
    )

    body = backend.last().body
    assert body["generator"] == {"name": "unity", "version": "2022.3", "type": "simulator"}
    assert body["reproducibility"] == {"seed": 7, "code_version": "abc123"}


def test_environment_is_captured_by_default(client, backend):
    """Without an explicit environment, git_metadata()/environment_metadata()
    fill reproducibility.environment automatically (spec: capture_environment
    default)."""
    _created(backend)

    client.generations.create(
        experiment_id="e1",
        name="x",
        generator="blender",
        seed=42,
    )

    environment = backend.last().body["reproducibility"]["environment"]
    assert environment["python_implementation"] == "CPython"
    assert "os" in environment


def test_capture_environment_false_leaves_reproducibility_empty(client, backend):
    _created(backend)

    client.generations.create(
        experiment_id="e1",
        name="x",
        generator="blender",
        capture_environment=False,
    )

    assert backend.last().body["reproducibility"] == {}


def test_explicit_environment_is_not_overwritten_by_auto_capture(client, backend):
    _created(backend)

    client.generations.create(
        experiment_id="e1",
        name="x",
        generator="blender",
        environment={"python_version": "3.11.9"},
    )

    assert backend.last().body["reproducibility"]["environment"] == {"python_version": "3.11.9"}


def test_seed_travels_inside_reproducibility(client, backend):
    """Seed is reproducibility metadata, not a top-level generation field."""
    _created(backend)

    client.generations.create(
        experiment_id="e1", name="x", generator="blender", parameters={}, seed=42
    )

    body = backend.last().body
    assert "seed" not in body
    assert body["reproducibility"]["seed"] == 42


def test_conflicting_seed_is_rejected(client, backend):
    with pytest.raises(SynthGraphValidationError):
        client.generations.create(
            experiment_id="e1",
            name="x",
            generator="blender",
            reproducibility=Reproducibility(seed=1),
            seed=2,
        )
    assert backend.requests == []


def test_matching_seed_is_accepted(client, backend):
    _created(backend)

    client.generations.create(
        experiment_id="e1",
        name="x",
        generator="blender",
        reproducibility={"seed": 42},
        seed=42,
    )

    assert backend.last().body["reproducibility"]["seed"] == 42


def test_conflicting_generator_version_is_rejected(client, backend):
    with pytest.raises(SynthGraphValidationError):
        client.generations.create(
            experiment_id="e1",
            name="x",
            generator=Generator(name="blender", version="4.2"),
            generator_version="4.3",
        )
    assert backend.requests == []


def test_environment_and_code_version_shorthands(client, backend):
    _created(backend)

    client.generations.create(
        experiment_id="e1",
        name="x",
        generator="blender",
        code_version="deadbeef",
        environment={"python_version": "3.11.9"},
    )

    assert backend.last().body["reproducibility"] == {
        "code_version": "deadbeef",
        "environment": {"python_version": "3.11.9"},
    }


def test_references_accept_ids_models_and_mappings(client, backend):
    _created(backend)

    client.generations.create(
        experiment_id="e1",
        name="x",
        generator="blender",
        inputs=[
            "asset_1",
            DatasetReference(id="d1", uri="s3://bucket/scenes", name="scenes", format="image"),
            {"id": "d2", "uri": "/data/extra"},
        ],
    )

    inputs = backend.last().body["inputs"]
    assert inputs[0] == {"id": "asset_1"}
    assert inputs[1]["uri"] == "s3://bucket/scenes"
    assert inputs[2] == {"id": "d2", "uri": "/data/extra"}


def test_reference_bytes_are_never_read(client, backend, tmp_path):
    """Referencing a file records its path, and nothing else."""
    dataset = tmp_path / "huge.bin"
    dataset.write_bytes(b"x" * 4096)
    _created(backend)

    client.generations.create(
        experiment_id="e1",
        name="x",
        generator="blender",
        outputs=[{"id": "d1", "uri": str(dataset)}],
    )

    body = json.dumps(backend.last().body)
    assert str(dataset) in body
    assert "xxxx" not in body


def test_unsupported_reference_type_is_rejected(client, backend):
    with pytest.raises(SynthGraphValidationError):
        client.generations.create(
            experiment_id="e1", name="x", generator="blender", inputs=[object()]
        )
    assert backend.requests == []


def test_unserializable_parameters_are_rejected_before_sending(client, backend):
    with pytest.raises(SynthGraphValidationError):
        client.generations.create(
            experiment_id="e1",
            name="x",
            generator="blender",
            parameters={"scene": object()},
        )
    assert backend.requests == []


def test_list_sends_the_parameter_filter_as_json(client, backend):
    backend.route(
        "GET", "/experiments/e1/generations", httpx.Response(200, json=[generation_payload()])
    )

    client.generations.list(experiment_id="e1", parameters={"weather": "rain", "occlusion": 0.3})

    query = backend.last().query
    assert json.loads(query["parameters"]) == {"weather": "rain", "occlusion": 0.3}


def test_list_without_a_filter_sends_no_query(client, backend):
    backend.route("GET", "/experiments/e1/generations", httpx.Response(200, json=[]))
    client.generations.list(experiment_id="e1")
    assert backend.last().query == {}


@pytest.mark.parametrize(
    ("method", "status"),
    [("start", "running"), ("complete", "completed"), ("fail", "failed")],
)
def test_lifecycle_methods_patch_status(client, backend, method, status):
    backend.route(
        "PATCH", "/generations/g1", httpx.Response(200, json=generation_payload(status=status))
    )

    result = getattr(client.generations, method)("g1")

    assert backend.last().method == "PATCH"
    assert backend.last().body == {"status": status}
    assert result.status is GenerationStatus(status)


def test_update_rejects_an_unknown_status(client, backend):
    with pytest.raises(SynthGraphValidationError):
        client.generations.update("g1", status="exploded")
    assert backend.requests == []


def test_update_requires_at_least_one_change(client, backend):
    with pytest.raises(SynthGraphValidationError):
        client.generations.update("g1")
    assert backend.requests == []


def test_update_patches_only_named_fields(client, backend):
    backend.route("PATCH", "/generations/g1", httpx.Response(200, json=generation_payload()))

    client.generations.update("g1", name="renamed", metadata={"note": "rerun"})

    assert backend.last().body == {"name": "renamed", "metadata": {"note": "rerun"}}


def test_get_parses_the_generation(client, backend):
    backend.route("GET", "/generations/g1", httpx.Response(200, json=generation_payload()))

    generation = client.generations.get("g1")

    assert generation.generator.name == "blender"
    assert generation.seed == 42
