import pytest
from pydantic import ValidationError

from synthgraph import AssetReference, DataReference, DatasetReference


def test_data_reference_creation() -> None:
    reference = DataReference(
        id="data_123",
        uri="file:///data/example",
        name="example",
    )

    assert reference.id == "data_123"
    assert reference.uri == "file:///data/example"
    assert reference.name == "example"
    assert reference.metadata == {}


def test_asset_reference_creation() -> None:
    reference = AssetReference(
        id="asset_123",
        uri="file:///data/model.blend",
        name="model.blend",
        type="3d_model",
    )

    assert reference.id == "asset_123"
    assert reference.type == "3d_model"


def test_dataset_reference_creation() -> None:
    reference = DatasetReference(
        id="dataset_123",
        uri="s3://bucket/dataset",
        name="synthetic-scenes",
        format="image",
        size=104857600,
    )

    assert reference.id == "dataset_123"
    assert reference.format == "image"
    assert reference.size == 104857600


def test_dataset_size_cannot_be_negative() -> None:
    with pytest.raises(ValidationError):
        DatasetReference(
            id="dataset_123",
            uri="s3://bucket/dataset",
            name="synthetic-scenes",
            size=-1,
        )


def test_reference_requires_id() -> None:
    with pytest.raises(ValidationError):
        DataReference(
            id="",
            uri="file:///data/example",
            name="example",
        )


def test_reference_requires_uri() -> None:
    with pytest.raises(ValidationError):
        DataReference(
            id="data_123",
            uri="",
            name="example",
        )


def test_reference_requires_name() -> None:
    with pytest.raises(ValidationError):
        DataReference(
            id="data_123",
            uri="file:///data/example",
            name="",
        )


def test_reference_metadata() -> None:
    reference = DataReference(
        id="data_123",
        uri="file:///data/example",
        name="example",
        metadata={
            "source": "research_pipeline",
            "version": 2,
        },
    )

    assert reference.metadata["source"] == "research_pipeline"
    assert reference.metadata["version"] == 2


def test_reference_is_immutable() -> None:
    reference = DataReference(
        id="data_123",
        uri="file:///data/example",
        name="example",
    )

    with pytest.raises(ValidationError):
        reference.name = "changed"