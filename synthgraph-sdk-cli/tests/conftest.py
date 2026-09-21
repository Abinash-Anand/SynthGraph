"""Shared fixtures.

Unit tests never touch the network: they drive the real HTTP layer through an
``httpx.MockTransport``, so request construction, headers, retries, response
validation and error mapping are all exercised for real.
"""

from __future__ import annotations

import json
from collections.abc import Callable, Iterator
from typing import Any

import httpx
import pytest

from synthgraph import SynthGraphClient

NOW = "2026-09-09T10:00:00Z"

API_KEY = "sg-test-key-abcdef123456"
API_URL = "http://backend.test"


class RecordedRequest:
    """A request the mock backend received."""

    def __init__(self, request: httpx.Request) -> None:
        self.method = request.method
        self.path = request.url.path
        self.raw_path = request.url.raw_path.decode().split("?", 1)[0]
        self.query = dict(httpx.QueryParams(request.url.query.decode()))
        self.headers = dict(request.headers)
        body = request.content.decode() or None
        self.body: Any = json.loads(body) if body else None

    def __repr__(self) -> str:  # pragma: no cover - debugging aid
        return f"RecordedRequest({self.method} {self.path} {self.query})"


class MockBackend:
    """A scriptable stand-in for the SynthGraph backend."""

    def __init__(self) -> None:
        self.requests: list[RecordedRequest] = []
        self._routes: dict[tuple[str, str], Any] = {}
        self._default: Any = None

    def route(self, method: str, path: str, response: Any) -> MockBackend:
        """Respond to ``method path`` with a response or a callable."""
        self._routes[(method.upper(), path)] = response
        return self

    def default(self, response: Any) -> MockBackend:
        self._default = response
        return self

    @property
    def transport(self) -> httpx.MockTransport:
        return httpx.MockTransport(self)

    def __call__(self, request: httpx.Request) -> httpx.Response:
        self.requests.append(RecordedRequest(request))
        handler = self._routes.get((request.method.upper(), request.url.path))
        if handler is None:
            handler = self._default
        if handler is None:
            return httpx.Response(404, json={"message": "Not found"})
        if callable(handler):
            return handler(request)
        return handler

    def last(self) -> RecordedRequest:
        assert self.requests, "no requests were made"
        return self.requests[-1]


@pytest.fixture
def backend() -> MockBackend:
    return MockBackend()


@pytest.fixture
def client(backend: MockBackend) -> Iterator[SynthGraphClient]:
    with SynthGraphClient(
        api_key=API_KEY,
        api_url=API_URL,
        transport=backend.transport,
    ) as sdk:
        yield sdk


@pytest.fixture
def make_client(backend: MockBackend) -> Callable[..., SynthGraphClient]:
    """Build a client with non-default configuration against the mock backend."""

    def factory(**kwargs: Any) -> SynthGraphClient:
        kwargs.setdefault("api_key", API_KEY)
        kwargs.setdefault("api_url", API_URL)
        return SynthGraphClient(transport=backend.transport, **kwargs)

    return factory


# -- payload builders ------------------------------------------------------


def project_payload(**overrides: Any) -> dict[str, Any]:
    payload = {
        "id": "p1",
        "name": "Rain research",
        "description": "Adverse weather detection",
        "created_at": NOW,
    }
    payload.update(overrides)
    return payload


def experiment_payload(**overrides: Any) -> dict[str, Any]:
    payload = {
        "id": "e1",
        "project_id": "p1",
        "name": "vehicle_detection_rain",
        "created_at": NOW,
    }
    payload.update(overrides)
    return payload


def generation_payload(**overrides: Any) -> dict[str, Any]:
    payload = {
        "id": "g1",
        "experiment_id": "e1",
        "name": "rain_pass",
        "generator": {"name": "blender", "version": "4.2"},
        "parameters": {"weather": "rain", "occlusion": 0.3},
        "reproducibility": {"seed": 42},
        "inputs": [],
        "outputs": [],
        "status": "pending",
        "created_at": NOW,
    }
    payload.update(overrides)
    return payload


def training_run_payload(**overrides: Any) -> dict[str, Any]:
    payload = {
        "id": "t1",
        "experiment_id": "e1",
        "name": "yolo_run_1",
        "trainer": {"name": "yolo", "type": "pytorch", "version": "2.1"},
        "parameters": {"epochs": 50},
        "capture_status": None,
        "datasets": [],
        "status": "pending",
        "created_at": NOW,
    }
    payload.update(overrides)
    return payload


def training_run_metric_payload(**overrides: Any) -> dict[str, Any]:
    payload = {
        "id": "m1",
        "training_run_id": "t1",
        "step": 100,
        "metrics": {"loss": 0.42},
        "created_at": NOW,
    }
    payload.update(overrides)
    return payload


def evaluation_payload(**overrides: Any) -> dict[str, Any]:
    payload = {
        "id": "ev1",
        "training_run_id": "t1",
        "dataset_version_id": "dv1",
        "name": "holdout_map",
        "metrics": {"mAP": 0.87},
        "created_at": NOW,
    }
    payload.update(overrides)
    return payload


def asset_payload(**overrides: Any) -> dict[str, Any]:
    payload = {
        "id": "a1",
        "name": "rain_render",
        "type": "video",
        "description": None,
        "metadata": {},
        "versions": [],
        "created_at": NOW,
    }
    payload.update(overrides)
    return payload


def asset_version_payload(**overrides: Any) -> dict[str, Any]:
    payload = {
        "id": "av1",
        "asset_id": "a1",
        "version": "1",
        "uri": "s3://bucket/rain_render.mp4",
        "created_at": NOW,
    }
    payload.update(overrides)
    return payload


def dataset_payload(**overrides: Any) -> dict[str, Any]:
    payload = {
        "id": "d1",
        "name": "rain_v1",
        "description": None,
        "metadata": {},
        "versions": [],
        "created_at": NOW,
    }
    payload.update(overrides)
    return payload


def dataset_version_payload(**overrides: Any) -> dict[str, Any]:
    payload = {
        "id": "dv1",
        "dataset_id": "d1",
        "version": "1",
        "uri": "s3://bucket/rain_v1",
        "format": "image",
        "created_at": NOW,
    }
    payload.update(overrides)
    return payload
