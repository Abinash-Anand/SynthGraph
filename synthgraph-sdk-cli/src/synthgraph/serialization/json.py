"""The Python-object -> canonical JSON boundary (spec 36).

Flexible fields (``parameters``, ``metadata``, ``metrics``, ``config``) hold
whatever a researcher's domain needs, but what crosses the wire must be valid
JSON. Unsupported objects are rejected loudly rather than coerced through
``str()``, so provenance never silently degrades into repr noise.
"""

from __future__ import annotations

import datetime as _dt
import json
import math
from collections.abc import Mapping, Sequence
from decimal import Decimal
from enum import Enum
from pathlib import PurePath
from typing import Any
from uuid import UUID

from pydantic import BaseModel

from ..errors import SynthGraphValidationError

__all__ = ["compact", "model_to_dict", "model_to_json", "to_jsonable"]

MAX_DEPTH = 32


def model_to_dict(model: BaseModel) -> dict[str, Any]:
    """Convert a SynthGraph model into JSON-compatible Python data."""
    return model.model_dump(mode="json")


def model_to_json(model: BaseModel) -> str:
    """Convert a SynthGraph model into a JSON string."""
    return json.dumps(model_to_dict(model))


def to_jsonable(value: Any, *, field: str = "value", _depth: int = 0) -> Any:
    """Convert *value* into something ``json.dumps`` accepts, or raise.

    Normalized: ``datetime``/``date`` to ISO-8601, ``UUID``/``Path`` to string,
    ``Decimal`` to float, ``Enum`` to its value, sets/tuples to lists, pydantic
    models via ``model_dump(mode="json")``.

    Rejected: non-finite floats (not valid JSON), non-string object keys, and
    any other object type.
    """
    if _depth > MAX_DEPTH:
        raise SynthGraphValidationError(
            f"{field} is nested more than {MAX_DEPTH} levels deep",
            field=field,
        )

    # bool is checked with str/int on purpose: bool is a subclass of int and
    # both are already valid JSON scalars.
    if value is None or isinstance(value, (str, bool, int)):
        return value
    if isinstance(value, float):
        if math.isnan(value) or math.isinf(value):
            raise SynthGraphValidationError(
                f"{field} must be a finite number; NaN and Infinity are not valid JSON",
                field=field,
            )
        return value
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, Enum):
        return to_jsonable(value.value, field=field, _depth=_depth + 1)
    if isinstance(value, (_dt.datetime, _dt.date)):
        return value.isoformat()
    if isinstance(value, UUID):
        return str(value)
    if isinstance(value, PurePath):
        return str(value)
    if isinstance(value, BaseModel):
        return value.model_dump(mode="json", exclude_none=True)
    if isinstance(value, Mapping):
        result: dict[str, Any] = {}
        for key, item in value.items():
            if not isinstance(key, str):
                raise SynthGraphValidationError(
                    f"{field} has a non-string key {key!r}; JSON object keys must be strings",
                    field=field,
                )
            result[key] = to_jsonable(item, field=f"{field}.{key}", _depth=_depth + 1)
        return result
    if isinstance(value, (set, frozenset)):
        return [
            to_jsonable(item, field=f"{field}[]", _depth=_depth + 1)
            for item in sorted(value, key=repr)
        ]
    if isinstance(value, Sequence):
        return [
            to_jsonable(item, field=f"{field}[{index}]", _depth=_depth + 1)
            for index, item in enumerate(value)
        ]

    raise SynthGraphValidationError(
        f"{field} contains an unsupported value of type {type(value).__name__!r}. "
        "Flexible fields must hold JSON-compatible values.",
        field=field,
    )


def compact(payload: Mapping[str, Any]) -> dict[str, Any]:
    """Drop ``None`` entries from a request body.

    The SDK sends only what the caller actually set, so a partial update never
    blanks a backend field the caller did not mention.
    """
    return {key: value for key, value in payload.items() if value is not None}
