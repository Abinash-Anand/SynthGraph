from __future__ import annotations

import httpx
import pytest

from synthgraph.errors import SynthGraphValidationError

EVALUATION = {
    "id": "ev1",
    "training_run_id": "t1",
    "metrics": {"mAP": 0.724, "precision": 0.78, "recall": 0.69},
}


def test_create_posts_under_the_training_run(client, backend):
    backend.route(
        "POST", "/training-runs/t1/evaluation-results", httpx.Response(201, json=EVALUATION)
    )

    result = client.evaluations.create(
        training_run_id="t1",
        metrics={"mAP": 0.724, "precision": 0.78, "recall": 0.69},
    )

    assert backend.last().path == "/training-runs/t1/evaluation-results"
    assert backend.last().body == {"metrics": {"mAP": 0.724, "precision": 0.78, "recall": 0.69}}
    assert result.metrics["mAP"] == 0.724


def test_evaluated_dataset_version_is_recorded(client, backend):
    backend.route(
        "POST", "/training-runs/t1/evaluation-results", httpx.Response(201, json=EVALUATION)
    )

    client.evaluations.create(
        training_run_id="t1", metrics={"mAP": 0.7}, dataset_version_id="dv9", name="holdout"
    )

    assert backend.last().body == {
        "name": "holdout",
        "metrics": {"mAP": 0.7},
        "dataset_version_id": "dv9",
    }


def test_metrics_must_be_a_mapping(client, backend):
    with pytest.raises(SynthGraphValidationError):
        client.evaluations.create(training_run_id="t1", metrics=[("mAP", 0.7)])
    assert backend.requests == []


def test_nan_metric_is_rejected(client, backend):
    with pytest.raises(SynthGraphValidationError):
        client.evaluations.create(training_run_id="t1", metrics={"mAP": float("nan")})
    assert backend.requests == []


def test_list_evaluations(client, backend):
    backend.route(
        "GET", "/training-runs/t1/evaluation-results", httpx.Response(200, json=[EVALUATION])
    )
    assert [item.id for item in client.evaluations.list(training_run_id="t1")] == ["ev1"]
