from __future__ import annotations

import json

import httpx

from synthgraph.cli.errors import ExitCode

COMPARISON = {
    "generation_ids": ["g1", "g2"],
    "differences": {
        "generator": {"name": {"g1": "blender", "g2": "blender"}},
        "generator_version": {"version": {"g1": "4.2", "g2": "4.3"}},
        "parameters": {
            "weather": {"g1": "rain", "g2": "snow"},
            "occlusion": {"g1": 0.3, "g2": 0.5},
        },
    },
}


def test_compare_posts_both_ids(run_cli, backend):
    backend.route("POST", "/generations/compare", httpx.Response(200, json=COMPARISON))

    result = run_cli("compare", "g1", "g2")

    assert result.exit_code == ExitCode.SUCCESS
    assert backend.last().body == {"generationIds": ["g1", "g2"]}


def test_compare_renders_the_backend_differences(run_cli, backend):
    backend.route("POST", "/generations/compare", httpx.Response(200, json=COMPARISON))

    result = run_cli("compare", "g1", "g2")

    assert "Generation A: g1" in result.stdout
    assert "Generation B: g2" in result.stdout
    assert "weather" in result.stdout
    assert "rain" in result.stdout and "snow" in result.stdout


def test_compare_json_is_the_backend_payload(run_cli, backend):
    backend.route("POST", "/generations/compare", httpx.Response(200, json=COMPARISON))

    result = run_cli("compare", "g1", "g2", "--json")

    assert json.loads(result.stdout) == COMPARISON


def test_compare_does_not_invent_structure_it_was_not_given(run_cli, backend):
    """An unfamiliar response is shown, not reinterpreted (spec 49)."""
    payload = {"generation_ids": ["g1", "g2"], "verdict": "identical configuration"}
    backend.route("POST", "/generations/compare", httpx.Response(200, json=payload))

    result = run_cli("compare", "g1", "g2")

    assert result.exit_code == ExitCode.SUCCESS
    assert "identical configuration" in result.stdout


def test_compare_requires_two_generations(run_cli, backend):
    result = run_cli("compare", "g1")

    assert result.exit_code == ExitCode.VALIDATION
    assert backend.requests == []


def test_compare_supports_more_than_two(run_cli, backend):
    backend.route(
        "POST",
        "/generations/compare",
        httpx.Response(200, json={"generation_ids": ["g1", "g2", "g3"], "differences": {}}),
    )

    result = run_cli("compare", "g1", "g2", "g3")

    assert result.exit_code == ExitCode.SUCCESS
    assert "Generation C: g3" in result.stdout
