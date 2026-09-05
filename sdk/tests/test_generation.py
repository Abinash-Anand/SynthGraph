import json

import httpx

from synthgraph.client import SynthGraphClient
from synthgraph.models import (
    AssetReference,
    DatasetReference,
    Generator,
    Reproducibility,
)


def test_create_generation() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.method == "POST"
        assert str(request.url) == (
            "https://api.example.com/experiments/experiment_123/generations"
        )
        assert json.loads(request.content) == {
            "name": "Rainy Scene Generation",
            "generator": {
                "name": "blender",
                "version": "4.2.0",
                "type": "3d_renderer",
            },
            "parameters": {
                "samples": 512,
                "weather": "rain",
            },
            "reproducibility": {
                "seed": 42,
            },
            "inputs": [],
            "outputs": [],
        }

        return httpx.Response(
            201,
            json={
                "id": "generation_123",
                "experiment_id": "experiment_123",
                "name": "Rainy Scene Generation",
                "generator": {
                    "name": "blender",
                    "version": "4.2.0",
                    "type": "3d_renderer",
                },
                "parameters": {
                    "samples": 512,
                    "weather": "rain",
                },
                "reproducibility": {
                    "seed": 42,
                },
                "inputs": [],
                "outputs": [],
                "status": "pending",
                "created_at": "2026-09-05T12:00:00Z",
            },
        )

    transport = httpx.MockTransport(handler)

    with SynthGraphClient(
        api_url="https://api.example.com",
        transport=transport,
    ) as client:
        generation = client.generations.create(
            experiment_id="experiment_123",
            name="Rainy Scene Generation",
            generator=Generator(
                name="blender",
                version="4.2.0",
                type="3d_renderer",
            ),
            parameters={
                "samples": 512,
                "weather": "rain",
            },
            reproducibility=Reproducibility(seed=42),
        )

    assert generation.id == "generation_123"
    assert generation.experiment_id == "experiment_123"
    assert generation.name == "Rainy Scene Generation"
    assert generation.status == "pending"


def test_create_generation_with_references() -> None:
    input_asset = AssetReference(
        id="asset_123",
        uri="file:///data/model.blend",
        name="model.blend",
        type="3d_model",
    )

    input_dataset = DatasetReference(
        id="dataset_123",
        uri="file:///data/input",
        name="input_dataset",
        format="image",
    )

    output_dataset = DatasetReference(
        id="dataset_456",
        uri="file:///data/output",
        name="output_dataset",
        format="image",
    )

    def handler(request: httpx.Request) -> httpx.Response:
        assert request.method == "POST"

        return httpx.Response(
            201,
            json={
                "id": "generation_123",
                "experiment_id": "experiment_123",
                "name": "Referenced Generation",
                "generator": {
                    "name": "blender",
                },
                "parameters": {},
                "reproducibility": {},
                "inputs": [
                    input_asset.model_dump(mode="json"),
                    input_dataset.model_dump(mode="json"),
                ],
                "outputs": [
                    output_dataset.model_dump(mode="json"),
                ],
                "status": "pending",
                "created_at": "2026-09-05T12:00:00Z",
            },
        )

    transport = httpx.MockTransport(handler)

    with SynthGraphClient(
        api_url="https://api.example.com",
        transport=transport,
    ) as client:
        generation = client.generations.create(
            experiment_id="experiment_123",
            name="Referenced Generation",
            generator=Generator(name="blender"),
            parameters={},
            reproducibility=Reproducibility(),
            inputs=[input_asset, input_dataset],
            outputs=[output_dataset],
        )

    assert generation.id == "generation_123"
    assert len(generation.inputs) == 2
    assert len(generation.outputs) == 1


def test_get_generation() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.method == "GET"
        assert str(request.url) == (
            "https://api.example.com/generations/generation_123"
        )

        return httpx.Response(
            200,
            json={
                "id": "generation_123",
                "experiment_id": "experiment_123",
                "name": "Rainy Scene Generation",
                "generator": {
                    "name": "blender",
                },
                "parameters": {},
                "reproducibility": {},
                "inputs": [],
                "outputs": [],
                "status": "completed",
                "created_at": "2026-09-05T12:00:00Z",
            },
        )

    transport = httpx.MockTransport(handler)

    with SynthGraphClient(
        api_url="https://api.example.com",
        transport=transport,
    ) as client:
        generation = client.generations.get("generation_123")

    assert generation.id == "generation_123"
    assert generation.experiment_id == "experiment_123"
    assert generation.status == "completed"


def test_list_generations() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.method == "GET"
        assert str(request.url) == (
            "https://api.example.com/experiments/experiment_123/generations"
        )

        return httpx.Response(
            200,
            json=[
                {
                    "id": "generation_123",
                    "experiment_id": "experiment_123",
                    "name": "Generation One",
                    "generator": {"name": "blender"},
                    "parameters": {},
                    "reproducibility": {},
                    "inputs": [],
                    "outputs": [],
                    "status": "completed",
                    "created_at": "2026-09-05T12:00:00Z",
                },
                {
                    "id": "generation_456",
                    "experiment_id": "experiment_123",
                    "name": "Generation Two",
                    "generator": {"name": "blender"},
                    "parameters": {},
                    "reproducibility": {},
                    "inputs": [],
                    "outputs": [],
                    "status": "pending",
                    "created_at": "2026-09-05T12:00:00Z",
                },
            ],
        )

    transport = httpx.MockTransport(handler)

    with SynthGraphClient(
        api_url="https://api.example.com",
        transport=transport,
    ) as client:
        generations = client.generations.list(
            experiment_id="experiment_123",
        )

    assert len(generations) == 2
    assert generations[0].id == "generation_123"
    assert generations[1].id == "generation_456"