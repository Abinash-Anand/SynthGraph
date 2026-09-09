from __future__ import annotations

import httpx
import pytest

from synthgraph.errors import SynthGraphValidationError
from synthgraph.models import DatasetVersion

TRAINING_RUN = {
    "id": "t1",
    "experiment_id": "e1",
    "model": "yolo",
    "framework": "pytorch",
    "config": {"epochs": 50},
}


def test_create_posts_under_the_experiment(client, backend):
    backend.route(
        "POST", "/experiments/e1/training-runs", httpx.Response(201, json=TRAINING_RUN)
    )

    run = client.training_runs.create(
        experiment_id="e1",
        model="yolo",
        framework="pytorch",
        config={"epochs": 50, "batch_size": 32},
    )

    assert backend.last().path == "/experiments/e1/training-runs"
    assert backend.last().body == {
        "model": "yolo",
        "framework": "pytorch",
        "config": {"epochs": 50, "batch_size": 32},
    }
    assert run.id == "t1"


def test_datasets_are_sent_as_version_references(client, backend):
    backend.route("POST", "/experiments/e1/training-runs", httpx.Response(201, json=TRAINING_RUN))

    client.training_runs.create(
        experiment_id="e1",
        model="yolo",
        datasets=["dv1", DatasetVersion(id="dv2"), {"id": "dv3", "role": "validation"}],
    )

    assert backend.last().body["datasets"] == [
        {"id": "dv1"},
        {"id": "dv2"},
        {"id": "dv3", "role": "validation"},
    ]


def test_model_is_required(client, backend):
    with pytest.raises(SynthGraphValidationError):
        client.training_runs.create(experiment_id="e1", model="")
    assert backend.requests == []


def test_unsupported_dataset_input_is_rejected(client, backend):
    with pytest.raises(SynthGraphValidationError):
        client.training_runs.create(experiment_id="e1", model="yolo", datasets=[object()])
    assert backend.requests == []


def test_list_and_get(client, backend):
    backend.route("GET", "/experiments/e1/training-runs", httpx.Response(200, json=[TRAINING_RUN]))
    backend.route("GET", "/training-runs/t1", httpx.Response(200, json=TRAINING_RUN))

    assert [run.id for run in client.training_runs.list(experiment_id="e1")] == ["t1"]
    assert client.training_runs.get("t1").framework == "pytorch"
