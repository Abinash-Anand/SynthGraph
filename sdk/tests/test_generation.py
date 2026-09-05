from datetime import UTC, datetime

import pytest
from pydantic import ValidationError

from synthgraph import (
    GenerationRun,
    GenerationStatus,
    Generator,
    Reproducibility,
)


def create_generation() -> GenerationRun:
    now = datetime.now(UTC)

    return GenerationRun(
        id="gen_123",
        experiment_id="exp_123",
        name="rainy_scene_generation_v1",
        description="Synthetic rainy driving scenes",
        generator=Generator(
            name="blender",
            version="4.2.0",
            type="3d_renderer",
        ),
        parameters={
            "render_engine": "cycles",
            "samples": 512,
            "resolution": {
                "width": 1920,
                "height": 1080,
            },
            "weather": "rain",
            "seed": 42,
        },
        reproducibility=Reproducibility(
            seed=42,
            code_version="git:a81f93c",
            environment={
                "python": "3.14.6",
                "os": "Windows",
            },
            configuration_hash="sha256:abc123",
        ),
        inputs=["asset_123"],
        outputs=["dataset_789"],
        status=GenerationStatus.COMPLETED,
        started_at=now,
        completed_at=now,
        created_at=now,
        metadata={
            "pipeline_stage": "dataset_generation",
        },
    )


def test_generation_run_creation() -> None:
    generation = create_generation()

    assert generation.id == "gen_123"
    assert generation.experiment_id == "exp_123"
    assert generation.name == "rainy_scene_generation_v1"
    assert generation.generator.name == "blender"
    assert generation.generator.version == "4.2.0"


def test_generation_run_supports_arbitrary_parameters() -> None:
    generation = create_generation()

    assert generation.parameters["render_engine"] == "cycles"
    assert generation.parameters["samples"] == 512
    assert generation.parameters["resolution"]["width"] == 1920
    assert generation.parameters["weather"] == "rain"


def test_generation_status() -> None:
    generation = create_generation()

    assert generation.status == GenerationStatus.COMPLETED
    assert generation.status.value == "completed"


def test_generation_reproducibility_metadata() -> None:
    generation = create_generation()

    assert generation.reproducibility.seed == 42
    assert generation.reproducibility.code_version == "git:a81f93c"
    assert generation.reproducibility.environment["os"] == "Windows"


def test_generation_inputs_and_outputs() -> None:
    generation = create_generation()

    assert generation.inputs == ["asset_123"]
    assert generation.outputs == ["dataset_789"]


def test_generation_defaults_empty_inputs_outputs_and_metadata() -> None:
    now = datetime.now(UTC)

    generation = GenerationRun(
        id="gen_123",
        experiment_id="exp_123",
        name="minimal-generation",
        generator=Generator(name="custom_generator"),
        parameters={},
        reproducibility=Reproducibility(),
        status=GenerationStatus.PENDING,
        created_at=now,
    )

    assert generation.inputs == []
    assert generation.outputs == []
    assert generation.metadata == {}


def test_generator_requires_name() -> None:
    with pytest.raises(ValidationError):
        Generator(name="")


def test_generation_requires_name() -> None:
    now = datetime.now(UTC)

    with pytest.raises(ValidationError):
        GenerationRun(
            id="gen_123",
            experiment_id="exp_123",
            name="",
            generator=Generator(name="blender"),
            parameters={},
            reproducibility=Reproducibility(),
            status=GenerationStatus.PENDING,
            created_at=now,
        )


def test_generation_is_immutable() -> None:
    generation = create_generation()

    with pytest.raises(ValidationError):
        generation.name = "changed"


def test_generation_serialization() -> None:
    generation = create_generation()

    data = generation.model_dump(mode="json")

    assert data["id"] == "gen_123"
    assert data["experiment_id"] == "exp_123"
    assert data["generator"]["name"] == "blender"
    assert data["status"] == "completed"
    assert data["reproducibility"]["seed"] == 42