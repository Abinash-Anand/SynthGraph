"""Reading the wire: response-shape validation and client-side input checks.

Two open contract items are handled here, in one place each, rather than as
scattered compatibility hacks (spec 36, 66):

* **List/object envelopes.** The spec leaves envelopes undecided, so a bare
  body and a ``{"data": ...}`` envelope are both accepted on read.
* **Field naming.** The SDK *sends* snake_case (spec 67 and the existing v0.1.0
  models). It *reads* snake_case or camelCase, because a NestJS backend may
  serialize either and the naming is not frozen yet.

Both tolerances are documented in CONTRACT.md.
"""

from __future__ import annotations

from collections.abc import Iterable, Mapping, Sequence
from typing import Any

from ..errors import SynthGraphTransportError, SynthGraphValidationError
from .json import to_jsonable

__all__ = [
    "get_field",
    "require_identifier",
    "require_mapping",
    "require_sequence",
    "require_text",
    "unwrap_list",
    "unwrap_object",
]

_ENVELOPE_KEYS = ("data", "items", "results")
_ENVELOPE_OUTER_KEYS = set(_ENVELOPE_KEYS) | {"meta", "pagination", "total", "count"}


def unwrap_object(
    payload: Any,
    *,
    operation: str | None = None,
    path: str | None = None,
) -> dict[str, Any]:
    """Validate that a response body is a JSON object and return it."""
    if isinstance(payload, Mapping):
        if set(payload) <= _ENVELOPE_OUTER_KEYS:
            for key in _ENVELOPE_KEYS:
                inner = payload.get(key)
                if isinstance(inner, Mapping):
                    return dict(inner)
        return dict(payload)

    raise SynthGraphTransportError(
        f"Expected a JSON object from {path or 'the backend'} "
        f"but received {type(payload).__name__}",
        operation=operation,
        path=path,
    )


def unwrap_list(
    payload: Any,
    *,
    operation: str | None = None,
    path: str | None = None,
) -> list[dict[str, Any]]:
    """Validate that a response body is a list of JSON objects and return it."""
    items: Any = payload

    if isinstance(payload, Mapping):
        for key in _ENVELOPE_KEYS:
            if isinstance(payload.get(key), list):
                items = payload[key]
                break
        else:
            raise SynthGraphTransportError(
                f"Expected a JSON array from {path or 'the backend'} but received an "
                "object with no recognized list envelope",
                operation=operation,
                path=path,
            )

    if not isinstance(items, list):
        raise SynthGraphTransportError(
            f"Expected a JSON array from {path or 'the backend'} "
            f"but received {type(payload).__name__}",
            operation=operation,
            path=path,
        )

    result: list[dict[str, Any]] = []
    for entry in items:
        if not isinstance(entry, Mapping):
            raise SynthGraphTransportError(
                f"Expected every item from {path or 'the backend'} to be a JSON object",
                operation=operation,
                path=path,
            )
        result.append(dict(entry))
    return result


def _camel(name: str) -> str:
    head, *rest = name.split("_")
    return head + "".join(part[:1].upper() + part[1:] for part in rest)


def get_field(data: Mapping[str, Any], name: str, *aliases: str, default: Any = None) -> Any:
    """Read a field from a backend payload, accepting snake_case or camelCase."""
    candidates: Iterable[str] = (name, _camel(name), *aliases)
    for key in candidates:
        if key in data:
            return data[key]
    return default


def require_text(value: Any, *, field: str) -> str:
    """Validate a required non-empty string."""
    if not isinstance(value, str) or not value.strip():
        raise SynthGraphValidationError(
            f"{field} is required and must be a non-empty string",
            field=field,
        )
    return value.strip()


def require_identifier(value: Any, *, field: str) -> str:
    """Validate a required identifier.

    The identifier format is an open contract item (spec 67), so this checks
    that the value is a usable single path segment rather than forcing a UUID
    shape the backend may not use. It also stops an identifier from smuggling
    extra path segments into a request URL.
    """
    text = require_text(value, field=field)
    if "/" in text or "\\" in text or text in {".", ".."}:
        raise SynthGraphValidationError(
            f"{field} is not a valid identifier: {value!r}",
            field=field,
        )
    return text


def require_mapping(value: Any, *, field: str) -> dict[str, Any]:
    """Validate that a flexible field is a JSON-serializable mapping."""
    if not isinstance(value, Mapping):
        raise SynthGraphValidationError(
            f"{field} must be a mapping, got {type(value).__name__}",
            field=field,
        )
    return to_jsonable(value, field=field)


def require_sequence(value: Any, *, field: str) -> list[Any]:
    """Validate that a field is a non-string sequence."""
    if isinstance(value, (str, bytes)) or not isinstance(value, Sequence):
        raise SynthGraphValidationError(
            f"{field} must be a list, got {type(value).__name__}",
            field=field,
        )
    return list(value)
