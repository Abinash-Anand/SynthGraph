import os

import pytest

from synthgraph import (
    AssetReference,
    DatasetReference,
    GenerationStatus,
    Generator,
    Reproducibility,
    SynthGraphClient,
    SynthGraphHTTPError,
)

API_URL = os.getenv("SYNTHGRAPH_INTEGRATION_API_URL")
API_KEY = os.getenv("SYNTHGRAPH_INTEGRATION_API_KEY")
EXPERIMENT_ID = os.getenv("SYNTHGRAPH_INTEGRATION_EXPERIMENT_ID")

pytestmark = pytest.mark.skipif(
    not all((API_URL, API_KEY, EXPERIMENT_ID)),
    reason=(
        "requires SYNTHGRAPH_INTEGRATION_API_URL, "
        "SYNTHGRAPH_INTEGRATION_API_KEY, and "
        "SYNTHGRAPH_INTEGRATION_EXPERIMENT_ID"
    ),
)


def test_generation_round_trip_against_real_backend() -> None:
    assert API_URL is not None
    assert API_KEY is not None
    assert EXPERIMENT_ID is not None

    input_reference = AssetReference(
        id="integration-input",
        uri="file:///integration/input.blend",
        name="input.blend",
        type="3d_model",
    )
    output_reference = DatasetReference(
        id="integration-output",
        uri="file:///integration/output",
        name="output",
        format="image",
        size=1,
    )

    with SynthGraphClient(api_url=API_URL, api_key=API_KEY) as client:
        created = client.generations.create(
            experiment_id=EXPERIMENT_ID,
            name="SDK real-backend integration",
            generator=Generator(
                name="integration-generator",
                version="1.0.0",
                type="test",
            ),
            parameters={"samples": 1},
            reproducibility=Reproducibility(
                seed=42,
                code_version="integration",
                environment={"mode": "test"},
                configuration_hash="integration-hash",
            ),
            inputs=["bare-reference", input_reference],
            outputs=[output_reference],
        )

        assert created.experiment_id == EXPERIMENT_ID
        assert created.status == GenerationStatus.PENDING
        assert created.inputs[0].id == "bare-reference"
        assert created.inputs[0].uri is None
        assert created.outputs[0].model_dump()["format"] == "image"

        fetched = client.generations.get(created.id)
        assert fetched == created

        listed = client.generations.list(experiment_id=EXPERIMENT_ID)
        assert any(item.id == created.id for item in listed)

        running = client.generations.start(created.id)
        assert running.status == GenerationStatus.RUNNING
        assert running.started_at is not None
        assert running.parameters == created.parameters

        completed = client.generations.complete(created.id)
        assert completed.status == GenerationStatus.COMPLETED
        assert completed.completed_at is not None
        assert completed.generator == created.generator

        with pytest.raises(SynthGraphHTTPError) as error:
            client.generations.fail(created.id)

        assert error.value.status_code == 409


def test_generation_failed_lifecycle_against_real_backend() -> None:
    assert API_URL is not None
    assert API_KEY is not None
    assert EXPERIMENT_ID is not None

    with SynthGraphClient(api_url=API_URL, api_key=API_KEY) as client:
        created = client.generations.create(
            experiment_id=EXPERIMENT_ID,
            name="SDK real-backend failed lifecycle",
            generator=Generator(name="integration-generator"),
            parameters={},
            reproducibility=Reproducibility(),
        )
        running = client.generations.start(created.id)
        failed = client.generations.fail(created.id)

    assert running.status == GenerationStatus.RUNNING
    assert failed.status == GenerationStatus.FAILED
    assert failed.completed_at is not None
