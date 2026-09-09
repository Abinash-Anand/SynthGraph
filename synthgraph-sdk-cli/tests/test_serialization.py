"""The Python -> canonical JSON boundary."""

from __future__ import annotations

import datetime as dt
import json
from decimal import Decimal
from enum import Enum
from pathlib import Path
from uuid import UUID

import pytest

from synthgraph.errors import SynthGraphTransportError, SynthGraphValidationError
from synthgraph.models import Generator
from synthgraph.serialization import (
    compact,
    get_field,
    model_to_dict,
    model_to_json,
    require_identifier,
    require_mapping,
    require_text,
    to_jsonable,
    unwrap_list,
    unwrap_object,
)


class Weather(str, Enum):
    RAIN = "rain"


def test_model_helpers_round_trip():
    generator = Generator(name="blender", version="4.2")
    assert model_to_dict(generator) == {"name": "blender", "version": "4.2", "type": None}
    assert json.loads(model_to_json(generator))["name"] == "blender"


@pytest.mark.parametrize(
    ("value", "expected"),
    [
        (None, None),
        ("rain", "rain"),
        (42, 42),
        (True, True),
        (0.3, 0.3),
        (Decimal("1.5"), 1.5),
        (Weather.RAIN, "rain"),
        (dt.date(2026, 9, 9), "2026-09-09"),
        (UUID(int=1), "00000000-0000-0000-0000-000000000001"),
        (Path("/data/rain"), "/data/rain"),
        ((1, 2), [1, 2]),
        ({"a": [1, {"b": None}]}, {"a": [1, {"b": None}]}),
    ],
)
def test_supported_values_are_normalized(value, expected):
    assert to_jsonable(value) == expected


def test_datetime_is_iso_8601():
    moment = dt.datetime(2026, 9, 9, 10, 0, tzinfo=dt.UTC)
    assert to_jsonable(moment) == "2026-09-09T10:00:00+00:00"


def test_sets_become_sorted_lists():
    assert to_jsonable({"a", "b"}) == ["a", "b"]


def test_pydantic_models_serialize():
    assert to_jsonable(Generator(name="blender")) == {"name": "blender"}


def test_unsupported_object_is_rejected_not_stringified():
    class Scene:
        pass

    with pytest.raises(SynthGraphValidationError) as excinfo:
        to_jsonable({"scene": Scene()}, field="parameters")

    assert "parameters.scene" in str(excinfo.value)
    assert "Scene" in str(excinfo.value)


@pytest.mark.parametrize("value", [float("nan"), float("inf"), float("-inf")])
def test_non_finite_floats_are_rejected(value):
    with pytest.raises(SynthGraphValidationError):
        to_jsonable({"occlusion": value}, field="parameters")


def test_non_string_keys_are_rejected():
    with pytest.raises(SynthGraphValidationError):
        to_jsonable({1: "one"}, field="parameters")


def test_deeply_nested_values_are_rejected():
    value: object = "leaf"
    for _ in range(40):
        value = {"nested": value}
    with pytest.raises(SynthGraphValidationError):
        to_jsonable(value, field="parameters")


def test_everything_that_survives_is_json_dumpable():
    payload = to_jsonable(
        {"when": dt.datetime(2026, 9, 9, tzinfo=dt.UTC), "path": Path("/x"), "ids": {UUID(int=2)}}
    )
    json.dumps(payload)


def test_compact_drops_none_only():
    assert compact({"a": 1, "b": None, "c": 0, "d": ""}) == {"a": 1, "c": 0, "d": ""}


def test_unwrap_object_accepts_bare_and_enveloped():
    assert unwrap_object({"id": "p1"}) == {"id": "p1"}
    assert unwrap_object({"data": {"id": "p1"}}) == {"id": "p1"}


def test_unwrap_object_keeps_a_data_field_that_is_real_content():
    payload = {"id": "p1", "data": {"nested": True}}
    assert unwrap_object(payload) == payload


def test_unwrap_list_accepts_bare_and_enveloped():
    assert unwrap_list([{"id": "p1"}]) == [{"id": "p1"}]
    assert unwrap_list({"data": [{"id": "p1"}]}) == [{"id": "p1"}]
    assert unwrap_list({"items": [], "total": 0}) == []


def test_unwrap_list_rejects_unknown_shapes():
    with pytest.raises(SynthGraphTransportError):
        unwrap_list({"unexpected": "shape"})


def test_get_field_reads_snake_case_and_camel_case():
    assert get_field({"created_at": "x"}, "created_at") == "x"
    assert get_field({"createdAt": "x"}, "created_at") == "x"
    assert get_field({}, "created_at", default="fallback") == "fallback"


@pytest.mark.parametrize("value", ["", "   ", None, 42])
def test_require_text_rejects_empty_and_wrong_types(value):
    with pytest.raises(SynthGraphValidationError):
        require_text(value, field="name")


@pytest.mark.parametrize("value", ["../secrets", "a/b", "..", "back\\slash"])
def test_require_identifier_rejects_path_traversal(value):
    with pytest.raises(SynthGraphValidationError):
        require_identifier(value, field="project_id")


def test_require_identifier_accepts_a_uuid_and_a_slug():
    assert require_identifier("6f1c8e2a-0000-4000-8000-000000000000", field="id")
    assert require_identifier("proj_123", field="id")


def test_require_mapping_rejects_non_mappings():
    with pytest.raises(SynthGraphValidationError):
        require_mapping(["not", "a", "mapping"], field="parameters")
