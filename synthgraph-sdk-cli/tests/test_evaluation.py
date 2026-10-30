from __future__ import annotations

import httpx
import pytest

from synthgraph.errors import SynthGraphValidationError

EVALUATION = {
    "id": "ev1",
    "training_run_id": "t1",
    "dataset_version_id": "dv9",
    "metrics": {"mAP": 0.724, "precision": 0.78, "recall": 0.69},
}


def test_create_posts_under_the_training_run(client, backend):
    backend.route(
        "POST", "/training-runs/t1/evaluations", httpx.Response(201, json=EVALUATION)
    )

    result = client.evaluations.create(
        training_run_id="t1",
        metrics={"mAP": 0.724, "precision": 0.78, "recall": 0.69},
        dataset_version_id="dv9",
    )

    assert backend.last().path == "/training-runs/t1/evaluations"
    assert backend.last().body == {
        "metrics": {"mAP": 0.724, "precision": 0.78, "recall": 0.69},
        "datasetVersionId": "dv9",
    }
    assert result.metrics["mAP"] == 0.724


def test_evaluated_dataset_version_is_recorded(client, backend):
    backend.route(
        "POST", "/training-runs/t1/evaluations", httpx.Response(201, json=EVALUATION)
    )

    client.evaluations.create(
        training_run_id="t1", metrics={"mAP": 0.7}, dataset_version_id="dv9", name="holdout"
    )

    assert backend.last().body == {
        "name": "holdout",
        "metrics": {"mAP": 0.7},
        "datasetVersionId": "dv9",
    }


def test_dataset_version_id_is_required(client, backend):
    with pytest.raises(TypeError):
        client.evaluations.create(training_run_id="t1", metrics={"mAP": 0.7})  # type: ignore[call-arg]
    assert backend.requests == []


def test_metrics_must_be_a_mapping(client, backend):
    with pytest.raises(SynthGraphValidationError):
        client.evaluations.create(
            training_run_id="t1", metrics=[("mAP", 0.7)], dataset_version_id="dv9"
        )
    assert backend.requests == []


def test_nan_metric_is_rejected(client, backend):
    with pytest.raises(SynthGraphValidationError):
        client.evaluations.create(
            training_run_id="t1", metrics={"mAP": float("nan")}, dataset_version_id="dv9"
        )
    assert backend.requests == []


def test_list_evaluations(client, backend):
    backend.route(
        "GET", "/training-runs/t1/evaluations", httpx.Response(200, json=[EVALUATION])
    )
    assert [item.id for item in client.evaluations.list(training_run_id="t1")] == ["ev1"]


def test_get_evaluation(client, backend):
    backend.route(
        "GET", "/evaluation-results/ev1", httpx.Response(200, json=EVALUATION)
    )
    assert client.evaluations.get("ev1").id == "ev1"


# -- checkpoint step (ARCH-006) ---------------------------------------------


def test_checkpoint_step_is_sent_when_given(client, backend):
    backend.route(
        "POST",
        "/training-runs/t1/evaluations",
        httpx.Response(201, json={**EVALUATION, "checkpointStep": 20160}),
    )

    result = client.evaluations.create(
        training_run_id="t1",
        metrics={"mAP": 0.7},
        dataset_version_id="dv9",
        checkpoint_step=20160,
    )

    assert backend.last().body == {
        "metrics": {"mAP": 0.7},
        "datasetVersionId": "dv9",
        "checkpointStep": 20160,
    }
    assert result.checkpoint_step == 20160


def test_checkpoint_step_is_left_out_when_not_given(client, backend):
    backend.route("POST", "/training-runs/t1/evaluations", httpx.Response(201, json=EVALUATION))

    result = client.evaluations.create(
        training_run_id="t1", metrics={"mAP": 0.7}, dataset_version_id="dv9"
    )

    assert "checkpointStep" not in backend.last().body
    assert result.checkpoint_step is None


def test_zero_is_a_real_checkpoint_step(client, backend):
    backend.route("POST", "/training-runs/t1/evaluations", httpx.Response(201, json=EVALUATION))

    client.evaluations.create(
        training_run_id="t1", metrics={"mAP": 0.7}, dataset_version_id="dv9", checkpoint_step=0
    )

    assert backend.last().body["checkpointStep"] == 0


def test_the_name_never_becomes_a_checkpoint_step(client, backend):
    backend.route("POST", "/training-runs/t1/evaluations", httpx.Response(201, json=EVALUATION))

    client.evaluations.create(
        training_run_id="t1",
        metrics={"mAP": 0.7},
        dataset_version_id="dv9",
        name="go1-eval-run3-step20160",
    )

    assert "checkpointStep" not in backend.last().body


@pytest.mark.parametrize("bad", [-1, 1.5, "10", True, False, [1], 2_147_483_648])
def test_an_invalid_checkpoint_step_is_rejected_before_sending(client, backend, bad):
    with pytest.raises(SynthGraphValidationError, match="checkpoint_step"):
        client.evaluations.create(
            training_run_id="t1",
            metrics={"mAP": 0.7},
            dataset_version_id="dv9",
            checkpoint_step=bad,
        )

    assert backend.requests == []


def test_the_largest_32_bit_step_is_allowed(client, backend):
    backend.route("POST", "/training-runs/t1/evaluations", httpx.Response(201, json=EVALUATION))

    client.evaluations.create(
        training_run_id="t1",
        metrics={"mAP": 0.7},
        dataset_version_id="dv9",
        checkpoint_step=2_147_483_647,
    )

    assert backend.last().body["checkpointStep"] == 2_147_483_647


def test_an_evaluation_without_a_step_reads_as_not_recorded(client, backend):
    backend.route("GET", "/evaluation-results/ev1", httpx.Response(200, json=EVALUATION))
    backend.route(
        "GET",
        "/evaluation-results/ev2",
        httpx.Response(200, json={**EVALUATION, "id": "ev2", "checkpointStep": None}),
    )

    assert client.evaluations.get("ev1").checkpoint_step is None
    assert client.evaluations.get("ev2").checkpoint_step is None
