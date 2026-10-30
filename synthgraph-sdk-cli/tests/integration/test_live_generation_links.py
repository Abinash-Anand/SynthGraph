"""Recorded generation links and project-scoped datasets against a real backend (ARCH-004).

Needs a backend with the ``datasets.project_id`` and ``training_run_generation_refs``
migrations applied.
"""

from __future__ import annotations

import json
import subprocess
import sys
import uuid

import pytest

from synthgraph import SynthGraphCrossProjectReferenceError

pytestmark = pytest.mark.integration


def _cli(*args: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [sys.executable, "-m", "synthgraph.cli.main", *args],
        capture_output=True,
        text=True,
        timeout=120,
    )


@pytest.fixture
def world(live_client):
    """Two projects: one with two experiments, one with one."""
    tag = uuid.uuid4().hex[:6]
    project_a = live_client.project(f"links-a-{tag}")
    project_b = live_client.project(f"links-b-{tag}")
    return {
        "a1": project_a.experiment("a1"),
        "a2": project_a.experiment("a2"),
        "b1": project_b.experiment("b1"),
    }


def test_a_run_records_a_generation_from_another_experiment_of_its_project(live_client, world):
    """Simulator-driven training: the generation produced no dataset."""
    generation = world["a2"].generation("sim-pass", generator="isaaclab")
    training = world["a1"].training(model="ppo", framework="rl")

    training.use(generation)

    references = training.generations()
    assert [(r.generation_id, r.generation_name, r.experiment_id) for r in references] == [
        (generation.id, "sim-pass", world["a2"].id)
    ]
    assert live_client.training_runs.get(training.id).generation_references[0].generation_id == (
        generation.id
    )


def test_use_is_idempotent_and_training_accepts_generations(live_client, world):
    first = world["a1"].generation("one", generator="isaaclab")
    second = world["a2"].generation("two", generator="isaaclab")

    training = world["a1"].training(model="ppo", framework="rl", generations=[first, second, first])
    training.use(first)
    training.link_generation(second.id)

    assert sorted(r.generation_name for r in training.generations()) == ["one", "two"]


def test_a_generation_of_another_project_is_refused_before_a_run_exists(live_client, world):
    foreign = world["b1"].generation("foreign", generator="isaaclab")

    with pytest.raises(SynthGraphCrossProjectReferenceError) as caught:
        world["a1"].training(model="ppo", framework="rl", generations=[foreign])

    assert caught.value.details["detected_by"] == "sdk"
    assert live_client.training_runs.list(experiment_id=world["a1"].id) == []


def test_the_backend_refuses_it_too_when_the_sdk_is_bypassed(live_client, world):
    foreign = world["b1"].generation("foreign", generator="isaaclab")
    training = world["a1"].training(model="ppo", framework="rl")

    with pytest.raises(SynthGraphCrossProjectReferenceError) as caught:
        live_client.training_runs.add_generation(training_run_id=training.id, generation=foreign.id)

    assert "detected_by" not in caught.value.details
    assert training.generations() == []


def test_a_dataset_belongs_to_the_project_that_first_used_it(live_client, world):
    generation = world["a1"].generation("pass", generator="blender")
    version = generation.dataset(name="rain", uri=f"s3://x/{uuid.uuid4().hex}")
    dataset_id = version.dataset_id
    assert live_client.datasets.get(dataset_id).project_id == world["a1"].experiment.project_id

    # Another experiment of the same project may reuse it.
    other = world["a2"].generation("pass2", generator="blender")
    other.dataset(name="rain", uri=f"s3://x/{uuid.uuid4().hex}", dataset_id=dataset_id)

    assert len(live_client.datasets.list_versions(dataset_id)) == 2


def test_reusing_a_dataset_in_another_project_creates_no_version(live_client, world):
    generation = world["a1"].generation("pass", generator="blender")
    version = generation.dataset(name="rain", uri=f"s3://x/{uuid.uuid4().hex}")
    dataset_id = version.dataset_id
    foreign = world["b1"].generation("foreign", generator="blender")

    with pytest.raises(SynthGraphCrossProjectReferenceError) as caught:
        foreign.dataset(name="rain", uri=f"s3://x/{uuid.uuid4().hex}", dataset_id=dataset_id)

    assert caught.value.details["detected_by"] == "sdk"
    # No new version was left behind by the rejected attach.
    assert len(live_client.datasets.list_versions(dataset_id)) == 1


def test_an_evaluation_cannot_use_another_projects_dataset_version(live_client, world):
    generation = world["a1"].generation("pass", generator="blender")
    version = generation.dataset(name="rain", uri=f"s3://x/{uuid.uuid4().hex}")
    foreign_run = world["b1"].training(model="ppo", framework="rl")

    with pytest.raises(SynthGraphCrossProjectReferenceError):
        foreign_run.evaluation(metrics={"a": 1}, dataset_version_id=version)

    assert foreign_run.evaluations() == []


def test_the_cli_links_lists_and_is_idempotent(live_client, world):
    generation = world["a2"].generation("cli-pass", generator="isaaclab")
    training = world["a1"].training(model="ppo", framework="rl")

    linked = _cli("training-runs", "link-generation", training.id, generation.id, "--json")
    again = _cli("training-runs", "link-generation", training.id, generation.id)
    listed = _cli("training-runs", "generations", training.id, "--json")

    assert linked.returncode == 0, linked.stderr
    assert json.loads(linked.stdout)["generation_name"] == "cli-pass"
    assert again.returncode == 0, again.stderr
    assert "Already linked" in again.stderr + again.stdout
    assert [row["generation_id"] for row in json.loads(listed.stdout)] == [generation.id]


def test_the_cli_reports_a_generation_of_another_project(live_client, world):
    foreign = world["b1"].generation("foreign", generator="isaaclab")
    training = world["a1"].training(model="ppo", framework="rl")

    result = _cli("training-runs", "link-generation", training.id, foreign.id)

    assert result.returncode == 6
    assert "different project" in result.stderr + result.stdout
