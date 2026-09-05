import json
from datetime import UTC, datetime

from synthgraph import (
    GenerationRun,
    GenerationStatus,
    Generator,
    Reproducibility,
)
from synthgraph.serialization import model_to_dict, model_to_json


def create_generation() -> GenerationRun:
    now = datetime.now(UTC)

    return GenerationRun(
        id="gen_123",
        experiment_id="exp_123",
        name="rainy_scene_generation",
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
        },
        reproducibility=Reproducibility(
            seed=42,
            code_version="git:abc123",
        ),
        status=GenerationStatus.COMPLETED,
        created_at=now,
    )


def test_model_to_dict() -> None:
    generation = create_generation()

    data = model_to_dict(generation)

    assert data["id"] == "gen_123"
    assert data["status"] == "completed"
    assert data["generator"]["name"] == "blender"


def test_datetime_is_serialized() -> None:
    generation = create_generation()

    data = model_to_dict(generation)

    assert isinstance(data["created_at"], str)
    assert data["created_at"].endswith("Z")


def test_nested_models_are_serialized() -> None:
    generation = create_generation()

    data = model_to_dict(generation)

    assert data["generator"]["version"] == "4.2.0"
    assert data["reproducibility"]["seed"] == 42


def test_parameters_are_preserved() -> None:
    generation = create_generation()

    data = model_to_dict(generation)

    assert data["parameters"] == {
        "render_engine": "cycles",
        "samples": 512,
        "resolution": {
            "width": 1920,
            "height": 1080,
        },
        "weather": "rain",
    }


def test_model_to_json() -> None:
    generation = create_generation()

    payload = model_to_json(generation)

    assert isinstance(payload, str)

    data = json.loads(payload)

    assert data["id"] == "gen_123"
    assert data["status"] == "completed"