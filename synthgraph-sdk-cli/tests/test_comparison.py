from __future__ import annotations

import httpx
import pytest

from synthgraph.errors import SynthGraphValidationError

COMPARISON = {
    "generation_ids": ["g1", "g2"],
    "differences": {
        "generator": {"name": {"g1": "blender", "g2": "blender"}},
        "parameters": {
            "weather": {"g1": "rain", "g2": "snow"},
            "occlusion": {"g1": 0.3, "g2": 0.5},
        },
    },
}


def test_compare_posts_the_generation_ids(client, backend):
    backend.route("POST", "/generations/compare", httpx.Response(200, json=COMPARISON))

    result = client.comparisons.compare(["g1", "g2"])

    assert backend.last().path == "/generations/compare"
    assert backend.last().body == {"generation_ids": ["g1", "g2"]}
    assert result.generation_ids == ["g1", "g2"]


def test_compare_result_is_backend_verbatim(client, backend):
    payload = dict(COMPARISON, backend_only="kept")
    backend.route("POST", "/generations/compare", httpx.Response(200, json=payload))

    assert client.comparisons.compare(["g1", "g2"]).to_dict() == payload


def test_compare_requires_two_generations(client, backend):
    with pytest.raises(SynthGraphValidationError):
        client.comparisons.compare(["g1"])
    assert backend.requests == []


def test_compare_supports_more_than_two(client, backend):
    backend.route("POST", "/generations/compare", httpx.Response(200, json=COMPARISON))
    client.comparisons.compare(["g1", "g2", "g3"])
    assert backend.last().body == {"generation_ids": ["g1", "g2", "g3"]}


def test_client_compare_shortcut(client, backend):
    backend.route("POST", "/generations/compare", httpx.Response(200, json=COMPARISON))

    client.compare("g1", "g2")
    assert backend.last().body == {"generation_ids": ["g1", "g2"]}

    client.compare(["g1", "g2"])
    assert backend.last().body == {"generation_ids": ["g1", "g2"]}


def test_generations_compare_delegates(client, backend):
    backend.route("POST", "/generations/compare", httpx.Response(200, json=COMPARISON))
    assert client.generations.compare(["g1", "g2"]).generation_ids == ["g1", "g2"]
