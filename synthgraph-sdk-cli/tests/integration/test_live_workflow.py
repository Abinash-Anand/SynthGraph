"""End-to-end against a real backend (spec 70, level 2 and 3).

These also serve as the contract check: if a route or payload here fails, the
SDK and the backend have diverged and CONTRACT.md needs a decision.
"""

from __future__ import annotations

import json
import os
import uuid

import pytest

from synthgraph import SynthGraph
from synthgraph.errors import SynthGraphAuthenticationError, SynthGraphNotFoundError

pytestmark = pytest.mark.integration


def test_authenticates(live_client):
    user = live_client.auth.me()
    assert user.id


def test_a_bad_key_is_rejected(live_client):
    with SynthGraph(
        api_key="obviously-not-a-real-key", api_url=live_client.config.api_url
    ) as client, pytest.raises(SynthGraphAuthenticationError):
        client.auth.me()


def test_projects_round_trip(live_client, live_project):
    fetched = live_client.projects.get(live_project.id)
    assert fetched.id == live_project.id
    assert live_project.id in {project.id for project in live_client.projects.list()}


def test_unknown_id_is_not_found(live_client):
    with pytest.raises(SynthGraphNotFoundError):
        live_client.projects.get(str(uuid.uuid4()))


def test_full_researcher_workflow(live_client, live_project, tmp_path):
    experiment = live_client.experiments.create(
        project_id=live_project.id, name=f"rain-{uuid.uuid4().hex[:6]}"
    )

    generation = live_client.generations.create(
        experiment_id=experiment.id,
        name="rain_pass",
        generator="blender",
        generator_version="4.2",
        parameters={"weather": "rain", "occlusion": 0.3},
        seed=42,
    )

    live_client.generations.start(generation.id)
    dataset = live_client.datasets.create(
        generation_id=generation.id,
        name="rain_dataset_v1",
        uri="s3://example-bucket/rain_dataset_v1",
        format="image",
    )
    completed = live_client.generations.complete(generation.id)
    assert completed.status.value == "completed"

    # search and filter happen on the backend
    assert experiment.id in {
        item.id for item in live_client.experiments.list(project_id=live_project.id)
    }
    filtered = live_client.generations.list(
        experiment_id=experiment.id, parameters={"weather": "rain"}
    )
    assert generation.id in {item.id for item in filtered}

    # export
    manifest = live_client.reproduction.get(generation.id)
    json.dumps(manifest.to_dict())
    documentation = live_client.documentation.get(generation.id)
    assert isinstance(documentation, str) and documentation.strip()

    assert dataset.id


@pytest.mark.skipif(
    os.environ.get("SYNTHGRAPH_INTEGRATION_TRAINING") != "1",
    reason=(
        "training-run and evaluation routes exercise newer backend endpoints; "
        "opt in with SYNTHGRAPH_INTEGRATION_TRAINING=1 to check them (see CONTRACT.md)"
    ),
)
def test_training_and_evaluation(live_client, live_project):
    experiment = live_client.experiments.create(
        project_id=live_project.id, name=f"training-{uuid.uuid4().hex[:6]}"
    )
    generation = live_client.generations.create(
        experiment_id=experiment.id,
        name="training-source",
        generator="blender",
        parameters={},
    )
    dataset = live_client.datasets.create(
        generation_id=generation.id,
        name=f"training-dataset-{uuid.uuid4().hex[:6]}",
        uri="s3://example-bucket/training_dataset_v1",
    )

    training = live_client.training_runs.create(
        experiment_id=experiment.id,
        model="yolo",
        framework="pytorch",
        config={"epochs": 1},
        datasets=[dataset.id],
    )
    assert [dv.id for dv in training.datasets] == [dataset.id]

    started = live_client.training_runs.start(training.id)
    assert started.status == "running"
    completed = live_client.training_runs.complete(training.id)
    assert completed.status == "completed"

    evaluation = live_client.evaluations.create(
        training_run_id=training.id,
        metrics={"mAP": 0.5},
        dataset_version_id=dataset.id,
    )
    assert evaluation.id
    assert [item.id for item in live_client.evaluations.list(training_run_id=training.id)] == [
        evaluation.id
    ]
    assert training.id in {
        item.id for item in live_client.training_runs.list(experiment_id=experiment.id)
    }


def test_isolation_between_users(live_client):
    """A user must not reach another user's data by knowing an ID (spec 65).

    Set SYNTHGRAPH_OTHER_PROJECT_ID to a project owned by a different account.
    """
    other = os.environ.get("SYNTHGRAPH_OTHER_PROJECT_ID")
    if not other:
        pytest.skip("SYNTHGRAPH_OTHER_PROJECT_ID is not set")

    from synthgraph.errors import SynthGraphAuthorizationError

    with pytest.raises((SynthGraphNotFoundError, SynthGraphAuthorizationError)):
        live_client.projects.get(other)
