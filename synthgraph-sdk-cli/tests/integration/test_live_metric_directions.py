"""Declared metric directions against a real backend (ARCH-001, PR 2).

Needs a backend that has the ``experiment_metric_directions`` migration applied.
"""

from __future__ import annotations

import json
import subprocess
import sys
import uuid

import pytest

from synthgraph import (
    SynthGraphMetricDirectionConflictError,
    SynthGraphNotFoundError,
    SynthGraphValidationError,
)

pytestmark = pytest.mark.integration


def _cli(*args: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [sys.executable, "-m", "synthgraph.cli.main", *args],
        capture_output=True,
        text=True,
        timeout=120,
    )


@pytest.fixture
def experiment(live_client, live_project):
    return live_client.experiments.create(
        project_id=live_project.id, name=f"directions-{uuid.uuid4().hex[:8]}"
    )


def test_a_fresh_experiment_has_nothing_declared(live_client, experiment):
    assert live_client.metric_directions.get(experiment.id).directions == {}


def test_declare_read_back_and_repeat_is_a_no_op(live_client, experiment):
    declared = live_client.metric_directions.declare(
        experiment.id, {"loss": "minimize", "reward": "maximize", "lr": "neutral"}
    )
    assert declared.directions == {"loss": "minimize", "reward": "maximize", "lr": "neutral"}

    again = live_client.metric_directions.declare(experiment.id, {"loss": "minimize"})
    assert again.directions["loss"] == "minimize"
    assert live_client.metric_directions.get(experiment.id).directions == declared.directions


def test_a_conflicting_declaration_is_rejected_and_changes_nothing(live_client, experiment):
    live_client.metric_directions.declare(experiment.id, {"loss": "minimize"})

    with pytest.raises(SynthGraphMetricDirectionConflictError) as caught:
        live_client.metric_directions.declare(
            experiment.id, {"loss": "maximize", "brand_new": "maximize"}
        )

    assert caught.value.conflicts == [
        {"metric_key": "loss", "declared": "minimize", "requested": "maximize"}
    ]
    # all or nothing: the new metric in the same call was not declared either
    assert live_client.metric_directions.get(experiment.id).directions == {"loss": "minimize"}


def test_names_do_not_decide_the_direction(live_client, experiment):
    """``loss`` may be declared maximize: the SDK and backend accept what is stated."""
    live_client.metric_directions.declare(experiment.id, {"loss": "maximize"})

    assert live_client.metric_directions.get(experiment.id).directions == {"loss": "maximize"}


def test_explicit_correction_needs_a_prior_declaration_and_a_note(live_client, experiment):
    with pytest.raises(SynthGraphNotFoundError):
        live_client.metric_directions.correct(
            experiment.id, "loss", "minimize", note="nothing declared yet"
        )

    live_client.metric_directions.declare(experiment.id, {"loss": "maximize"})
    corrected = live_client.metric_directions.correct(
        experiment.id, "loss", "minimize", note="declared the wrong way round"
    )

    assert corrected.directions == {"loss": "minimize"}
    with pytest.raises(SynthGraphValidationError):
        live_client.metric_directions.correct(experiment.id, "loss", "maximize", note="  ")


def test_keys_with_slashes_and_exact_characters_round_trip(live_client, experiment):
    live_client.metric_directions.declare(
        experiment.id, {"eval/episode_reward": "maximize", "loss*": "minimize"}
    )

    assert live_client.metric_directions.get(experiment.id).directions == {
        "eval/episode_reward": "maximize",
        "loss*": "minimize",
    }
    live_client.metric_directions.correct(
        experiment.id, "eval/episode_reward", "neutral", note="not an objective here"
    )
    assert (
        live_client.metric_directions.get(experiment.id).directions["eval/episode_reward"]
        == "neutral"
    )


def test_directions_are_per_experiment(live_client, live_project, experiment):
    other = live_client.experiments.create(
        project_id=live_project.id, name=f"directions-other-{uuid.uuid4().hex[:8]}"
    )
    live_client.metric_directions.declare(experiment.id, {"loss": "minimize"})

    assert live_client.metric_directions.get(other.id).directions == {}
    live_client.metric_directions.declare(other.id, {"loss": "maximize"})
    assert live_client.metric_directions.get(experiment.id).directions == {"loss": "minimize"}


def test_an_unknown_experiment_is_a_not_found_error(live_client):
    with pytest.raises(SynthGraphNotFoundError):
        live_client.metric_directions.get(str(uuid.uuid4()))


def test_training_declares_before_creating_the_run(live_client, live_project):
    handle = live_client.project(live_project.name).experiment(
        f"directions-fluent-{uuid.uuid4().hex[:8]}"
    )
    handle.declare_metric_direction("loss", "minimize")

    with pytest.raises(SynthGraphMetricDirectionConflictError):
        handle.training(model="yolo", metric_directions={"loss": "maximize"})
    assert handle.training_runs() == []

    training = handle.training(
        model="yolo", metric_directions={"loss": "minimize", "mAP": "maximize"}
    )
    assert training.training_run.id
    assert handle.metric_directions() == {"loss": "minimize", "mAP": "maximize"}
    assert len(handle.training_runs()) == 1


def test_the_cli_declares_lists_and_corrects(live_client, experiment):
    declared = _cli("metrics", "set-direction", experiment.id, "loss", "minimize", "--json")
    assert declared.returncode == 0, declared.stderr
    assert json.loads(declared.stdout)["directions"] == {"loss": "minimize"}

    conflict = _cli("metrics", "set-direction", experiment.id, "loss", "maximize")
    assert conflict.returncode == 6
    assert "Nothing was changed" in conflict.stderr + conflict.stdout

    corrected = _cli(
        "metrics", "correct-direction", experiment.id, "loss", "maximize", "--note", "intended"
    )
    assert corrected.returncode == 0, corrected.stderr

    listed = _cli("metrics", "list", experiment.id, "--json")
    assert json.loads(listed.stdout)["directions"] == {"loss": "maximize"}
