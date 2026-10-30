"""Evaluation checkpoint steps against a real backend (ARCH-006, PR 1).

Needs a backend that has the ``checkpoint_step`` migration applied.
"""

from __future__ import annotations

import json
import subprocess
import sys
import uuid

import pytest

from synthgraph import SynthGraphValidationError

pytestmark = pytest.mark.integration


def _cli(*args: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [sys.executable, "-m", "synthgraph.cli.main", *args],
        capture_output=True,
        text=True,
        timeout=120,
    )


@pytest.fixture
def training(live_client, live_project):
    handle = live_client.project(live_project.name).experiment(f"checkpoint-{uuid.uuid4().hex[:8]}")
    generation = handle.generation("pass", generator="blender")
    version = generation.dataset(name="rain_v1", uri="s3://bucket/rain_v1")
    run = handle.training(model="policy", dataset=version)
    return run, version


def test_the_step_is_recorded_and_read_back(live_client, training):
    run, version = training

    evaluation = run.evaluation(
        metrics={"mAP": 0.7}, dataset_version_id=version, name="final", checkpoint_step=20160
    )

    assert evaluation.result.checkpoint_step == 20160
    assert live_client.evaluations.get(evaluation.id).checkpoint_step == 20160
    listed = live_client.evaluations.list(training_run_id=run.id)
    assert [item.checkpoint_step for item in listed] == [20160]


def test_an_evaluation_without_a_step_has_none_even_if_the_name_has_one(live_client, training):
    run, version = training

    evaluation = run.evaluation(
        metrics={"mAP": 0.7}, dataset_version_id=version, name="go1-eval-run3-step20160"
    )

    assert evaluation.result.checkpoint_step is None
    assert live_client.evaluations.get(evaluation.id).checkpoint_step is None


def test_zero_and_the_largest_step_round_trip(training):
    run, version = training

    zero = run.evaluation(metrics={"a": 1}, dataset_version_id=version, checkpoint_step=0)
    largest = run.evaluation(
        metrics={"a": 1}, dataset_version_id=version, checkpoint_step=2_147_483_647
    )

    assert zero.result.checkpoint_step == 0
    assert largest.result.checkpoint_step == 2_147_483_647


def test_a_bad_step_is_rejected_locally_and_nothing_is_recorded(live_client, training):
    run, version = training

    with pytest.raises(SynthGraphValidationError):
        run.evaluation(metrics={"a": 1}, dataset_version_id=version, checkpoint_step=-1)

    assert live_client.evaluations.list(training_run_id=run.id) == []


def test_the_backend_also_rejects_a_bad_step(live_client, training):
    """The backend does not rely on the SDK: send an invalid step straight over HTTP."""
    run, version = training

    with pytest.raises(SynthGraphValidationError):
        live_client._http.post(
            f"/training-runs/{run.id}/evaluations",
            json={
                "datasetVersionId": version.id,
                "metrics": {"a": 1},
                "checkpointStep": 1.5,
            },
            operation="test",
        )

    assert live_client.evaluations.list(training_run_id=run.id) == []


def test_the_cli_shows_the_step(training):
    run, version = training
    with_step = run.evaluation(
        metrics={"a": 1}, dataset_version_id=version, name="x", checkpoint_step=750
    )

    result = _cli("evaluations", "get", with_step.id, "--json")

    assert result.returncode == 0, result.stderr
    assert json.loads(result.stdout)["checkpoint_step"] == 750
