"""Interactive ID resolution: remembered context and drill-down pickers."""

from __future__ import annotations

import httpx
import pytest

from synthgraph.cli import interactive as interactive_module
from synthgraph.cli.errors import ExitCode

from ..conftest import experiment_payload, project_payload, training_run_payload


@pytest.fixture
def interactive_mode(monkeypatch):
    """Simulate a human at the keyboard, without needing a real TTY."""
    monkeypatch.setattr(interactive_module, "is_interactive", lambda: True)

    def fake_prompt_factory(*responses: str):
        responses_iter = iter(responses)

        def fake_prompt(_message, default=None):
            try:
                return next(responses_iter)
            except StopIteration:
                return default

        return fake_prompt

    return fake_prompt_factory


def test_missing_project_is_a_helpful_usage_error_when_not_interactive(run_cli):
    result = run_cli("experiments", "list")

    assert result.exit_code == ExitCode.USAGE
    assert "not running interactively" in result.stderr
    assert "synthgraph projects list" in result.stderr


def test_prompts_and_picks_a_project_when_interactive(
    run_cli, backend, monkeypatch, interactive_mode
):
    monkeypatch.setattr("typer.prompt", interactive_mode("2"))
    backend.route(
        "GET",
        "/projects",
        httpx.Response(
            200,
            json=[
                project_payload(id="p1", name="Rain research"),
                project_payload(id="p2", name="Snow research"),
            ],
        ),
    )
    backend.route(
        "GET", "/projects/p2/experiments", httpx.Response(200, json=[])
    )

    result = run_cli("experiments", "list")

    assert result.exit_code == ExitCode.SUCCESS
    assert "Pick one" in result.stdout or "Pick one" in result.stderr
    assert "Rain research" in result.output
    assert "Snow research" in result.output
    assert backend.last().path == "/projects/p2/experiments"


def test_remembers_the_picked_project_as_the_prompt_default(
    run_cli, backend, monkeypatch, interactive_mode
):
    backend.route(
        "GET",
        "/projects",
        httpx.Response(200, json=[project_payload(id="p1")]),
    )
    backend.route("GET", "/projects/p1/experiments", httpx.Response(200, json=[]))

    # First call: no remembered project, explicit --project given - this just
    # records p1 as "last used" without ever prompting.
    run_cli("experiments", "list", "--project", "p1")

    # Second call: omit --project entirely. The prompt should default to the
    # remembered choice.
    prompt_calls: list[tuple[str, str | None]] = []

    def recording_prompt(message, default=None):
        prompt_calls.append((message, default))
        return default

    monkeypatch.setattr("typer.prompt", recording_prompt)

    result = run_cli("experiments", "list")

    assert result.exit_code == ExitCode.SUCCESS
    assert prompt_calls == [("Enter a number (1-1)", "1")]


def test_raises_a_clear_error_when_there_is_nothing_to_pick_from(
    run_cli, backend, monkeypatch, interactive_mode
):
    monkeypatch.setattr(interactive_module, "is_interactive", lambda: True)
    backend.route("GET", "/projects", httpx.Response(200, json=[]))

    result = run_cli("experiments", "list")

    assert result.exit_code == ExitCode.USAGE
    assert "no projects yet" in result.stderr


def test_experiment_resolution_drills_into_a_project_pick_first(
    run_cli, backend, monkeypatch, interactive_mode
):
    monkeypatch.setattr(
        "typer.prompt", interactive_mode("1", "1")
    )
    backend.route(
        "GET", "/projects", httpx.Response(200, json=[project_payload(id="p1")])
    )
    backend.route(
        "GET",
        "/projects/p1/experiments",
        httpx.Response(200, json=[experiment_payload(id="e1", project_id="p1")]),
    )
    backend.route("GET", "/experiments/e1/generations", httpx.Response(200, json=[]))

    result = run_cli("generations", "list")

    assert result.exit_code == ExitCode.SUCCESS
    assert backend.last().path == "/experiments/e1/generations"


def test_training_run_resolution_drills_through_project_and_experiment(
    run_cli, backend, monkeypatch, interactive_mode
):
    monkeypatch.setattr(
        "typer.prompt", interactive_mode("1", "1", "1")
    )
    backend.route(
        "GET", "/projects", httpx.Response(200, json=[project_payload(id="p1")])
    )
    backend.route(
        "GET",
        "/projects/p1/experiments",
        httpx.Response(200, json=[experiment_payload(id="e1", project_id="p1")]),
    )
    backend.route(
        "GET",
        "/experiments/e1/training-runs",
        httpx.Response(200, json=[training_run_payload(id="t1", experiment_id="e1")]),
    )
    backend.route(
        "GET", "/training-runs/t1", httpx.Response(200, json=training_run_payload(id="t1"))
    )

    result = run_cli("training-runs", "get")

    assert result.exit_code == ExitCode.SUCCESS
    assert backend.last().path == "/training-runs/t1"


def test_an_invalid_selection_is_a_usage_error(run_cli, backend, monkeypatch, interactive_mode):
    monkeypatch.setattr("typer.prompt", interactive_mode("99"))
    backend.route(
        "GET", "/projects", httpx.Response(200, json=[project_payload(id="p1")])
    )

    result = run_cli("experiments", "list")

    assert result.exit_code == ExitCode.USAGE
    assert "not one of the listed numbers" in result.stderr
