"""Reference models carry metadata, never bytes."""

from __future__ import annotations

import pytest
from pydantic import ValidationError as PydanticValidationError

from synthgraph.models import AssetReference, DataReference, DatasetReference


def test_dataset_reference_records_location_not_content():
    reference = DatasetReference(
        id="dataset_123",
        uri="s3://bucket/input-scenes",
        name="input-scenes",
        format="image",
        size=4096,
        checksum="sha256:abc",
    )
    payload = reference.model_dump(mode="json")
    assert payload["uri"] == "s3://bucket/input-scenes"
    assert set(payload) <= {
        "id",
        "uri",
        "name",
        "metadata",
        "format",
        "size",
        "version",
        "checksum",
    }


def test_asset_reference_extends_data_reference():
    asset = AssetReference(id="a1", uri="/assets/car.blend", name="car", type="mesh")
    assert isinstance(asset, DataReference)
    assert asset.type == "mesh"


@pytest.mark.parametrize("field", ["id", "uri", "name"])
def test_references_require_identity_and_location(field):
    values = {"id": "a1", "uri": "/x", "name": "x"}
    values[field] = ""
    with pytest.raises(PydanticValidationError):
        DataReference(**values)


def test_reference_metadata_defaults_to_empty():
    assert DataReference(id="a1", uri="/x", name="x").metadata == {}


def test_negative_dataset_size_rejected():
    with pytest.raises(PydanticValidationError):
        DatasetReference(id="d1", uri="/x", name="x", size=-5)
