"""Handle accessors, refresh and the remaining resource methods."""

from __future__ import annotations

import httpx
import pytest

from synthgraph.errors import SynthGraphValidationError

from .conftest import experiment_payload, generation_payload, project_payload

TRAINING_RUN = {"id": "t1", "experiment_id": "e1", "model": "yolo", "framework": "pytorch"}
EVALUATION = {"id": "ev1", "training_run_id": "t1", "metrics": {"mAP": 0.7}}


@pytest.fixture
def handles(client, backend):
    backend.route("POST", "/projects", httpx.Response(201, json=project_payload()))
    backend.route("GET", "/projects/p1", httpx.Response(200, json=project_payload()))
    backend.route(
        "POST", "/projects/p1/experiments", httpx.Response(201, json=experiment_payload())
    )
    backend.route("GET", "/experiments/e1", httpx.Response(200, json=experiment_payload()))
    backend.route(
        "GET", "/projects/p1/experiments", httpx.Response(200, json=[experiment_payload()])
    )
    backend.route(
        "POST", "/experiments/e1/generations", httpx.Response(201, json=generation_payload())
    )
    backend.route("GET", "/generations/g1", httpx.Response(200, json=generation_payload()))
    backend.route(
        "GET", "/experiments/e1/generations", httpx.Response(200, json=[generation_payload()])
    )
    backend.route("POST", "/experiments/e1/training-runs", httpx.Response(201, json=TRAINING_RUN))
    backend.route("GET", "/experiments/e1/training-runs", httpx.Response(200, json=[TRAINING_RUN]))
    backend.route("GET", "/training-runs/t1", httpx.Response(200, json=TRAINING_RUN))
    backend.route("POST", "/training-runs/t1/datasets", httpx.Response(200, json=TRAINING_RUN))
    backend.route(
        "POST", "/training-runs/t1/evaluations", httpx.Response(201, json=EVALUATION)
    )
    backend.route(
        "GET", "/training-runs/t1/evaluations", httpx.Response(200, json=[EVALUATION])
    )
    backend.route("GET", "/evaluation-results/ev1", httpx.Response(200, json=EVALUATION))
    return client


def test_project_handle(handles):
    project = handles.project("Rain research")

    assert project.id == "p1"
    assert project.name == "Rain research"
    assert "p1" in repr(project)
    assert project.refresh().id == "p1"
    assert [item.id for item in project.experiments()] == ["e1"]


def test_experiment_handle(handles):
    experiment = handles.project("Rain research").experiment("vehicle_detection_rain")

    assert experiment.name == "vehicle_detection_rain"
    assert "e1" in repr(experiment)
    assert experiment.refresh().id == "e1"
    assert [item.id for item in experiment.generations()] == ["g1"]
    assert [item.id for item in experiment.training_runs()] == ["t1"]


def test_generation_handle(handles):
    experiment = handles.project("Rain research").experiment("vehicle_detection_rain")
    generation = experiment.generation(generator="blender", parameters={})

    assert generation.id == "g1"
    assert "g1" in repr(generation)
    assert generation.refresh().status == "pending"


def test_generation_defaults_its_name_to_the_generator(handles, backend):
    experiment = handles.project("Rain research").experiment("vehicle_detection_rain")

    experiment.generation(generator="blender", parameters={})

    assert backend.last().body["name"] == "blender"


def test_generation_requires_a_generator(handles):
    experiment = handles.project("Rain research").experiment("vehicle_detection_rain")

    with pytest.raises(SynthGraphValidationError):
        experiment.generation(generator="")


def test_training_handle(handles):
    experiment = handles.project("Rain research").experiment("vehicle_detection_rain")
    training = experiment.training(model="yolo", framework="pytorch")

    assert training.id == "t1"
    assert "t1" in repr(training)
    assert training.refresh().id == "t1"
    assert [item.id for item in training.evaluations()] == ["ev1"]
    assert training.add_dataset("dv1").id == "t1"


def test_evaluation_handle(handles):
    experiment = handles.project("Rain research").experiment("vehicle_detection_rain")
    evaluation = experiment.training(model="yolo").evaluation(
        metrics={"mAP": 0.7}, dataset_version_id="dv1"
    )

    assert evaluation.id == "ev1"
    assert evaluation.metrics["mAP"] == 0.7
    assert "ev1" in repr(evaluation)
    assert evaluation.refresh().id == "ev1"


def test_evaluations_get(handles):
    assert handles.evaluations.get("ev1").id == "ev1"


def test_training_add_dataset_sends_one_reference(handles, backend):
    # add_dataset() re-fetches the training run after attaching (the attach
    # endpoint itself returns the reference row, not a TrainingRun), so the
    # attach request is the second-to-last, not the last.
    handles.training_runs.add_dataset(training_run_id="t1", dataset="dv1")
    attach_request = backend.requests[-2]
    assert attach_request.body == {"datasetVersionId": "dv1", "role": "training"}
    assert attach_request.path == "/training-runs/t1/datasets"
