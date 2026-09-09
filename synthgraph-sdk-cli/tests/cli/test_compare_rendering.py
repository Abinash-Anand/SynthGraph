"""The comparison renderer must present what the backend sent, in any shape.

The response schema is an open contract item (CONTRACT.md §3), so these cover
the shapes the renderer has to survive without inventing or losing meaning.
"""

from __future__ import annotations

import httpx
import pytest

from synthgraph.cli.errors import ExitCode


@pytest.fixture
def compare_with(backend):
    def route(payload):
        backend.route("POST", "/generations/compare", httpx.Response(200, json=payload))

    return route


def test_differences_as_a_list(run_cli, compare_with):
    compare_with(
        {
            "generation_ids": ["g1", "g2"],
            "differences": ["weather: rain -> snow", "occlusion: 0.3 -> 0.5"],
        }
    )

    result = run_cli("compare", "g1", "g2")

    assert result.exit_code == ExitCode.SUCCESS
    assert "weather: rain -> snow" in result.stdout
    assert "occlusion: 0.3 -> 0.5" in result.stdout


def test_section_values_aligned_to_generation_order(run_cli, compare_with):
    compare_with(
        {
            "generation_ids": ["g1", "g2"],
            "differences": {"parameters": {"weather": ["rain", "snow"]}},
        }
    )

    result = run_cli("compare", "g1", "g2")

    assert "A: rain" in result.stdout
    assert "B: snow" in result.stdout


def test_scalar_section_content(run_cli, compare_with):
    compare_with(
        {"generation_ids": ["g1", "g2"], "differences": {"generator": "identical"}}
    )

    assert "identical" in run_cli("compare", "g1", "g2").stdout


def test_list_section_content(run_cli, compare_with):
    compare_with(
        {"generation_ids": ["g1", "g2"], "differences": {"parameters": ["weather", "occlusion"]}}
    )

    result = run_cli("compare", "g1", "g2")

    assert "weather" in result.stdout and "occlusion" in result.stdout


def test_nested_values_are_rendered_not_dropped(run_cli, compare_with):
    compare_with(
        {
            "generation_ids": ["g1", "g2"],
            "differences": {"parameters": {"camera": {"g1": {"fov": 60}, "g2": {"fov": 90}}}},
        }
    )

    result = run_cli("compare", "g1", "g2")

    assert "fov" in result.stdout
    assert "60" in result.stdout and "90" in result.stdout


def test_summary_mapping_is_shown(run_cli, compare_with):
    compare_with(
        {
            "generation_ids": ["g1", "g2"],
            "differences": {},
            "summary": {"changed_parameters": 2},
        }
    )

    result = run_cli("compare", "g1", "g2")

    assert "Summary" in result.stdout
    assert "changed_parameters" in result.stdout


def test_summary_scalar_is_shown(run_cli, compare_with):
    compare_with(
        {"generation_ids": ["g1", "g2"], "summary": "two parameters differ"}
    )

    assert "two parameters differ" in run_cli("compare", "g1", "g2").stdout


def test_an_empty_result_is_not_reported_as_identical(run_cli, compare_with):
    """Saying nothing is not the same as saying "no differences"."""
    compare_with({"generation_ids": ["g1", "g2"]})

    result = run_cli("compare", "g1", "g2")

    assert result.exit_code == ExitCode.SUCCESS
    assert "no differences" in result.stdout.lower()


def test_more_than_twenty_six_generations_fall_back_to_numbers(run_cli, compare_with):
    ids = [f"g{index}" for index in range(28)]
    compare_with({"generation_ids": ids, "differences": {}})

    result = run_cli("compare", *ids)

    assert "Generation Z: g25" in result.stdout
    assert "Generation 27: g26" in result.stdout
