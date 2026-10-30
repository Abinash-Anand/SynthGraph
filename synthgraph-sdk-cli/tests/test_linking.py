"""Linking a training run to the data it was trained on.

The dashboard's lineage graph is only as connected as the links the SDK records.
These tests pin the ergonomics that make recording them the easy path: a
generation remembers what it produced, and a training run can be told to use it.
"""

from __future__ import annotations

import httpx
import pytest

from synthgraph.errors import SynthGraphValidationError

from .conftest import (
    dataset_payload,
    dataset_version_payload,
    evaluation_payload,
    experiment_payload,
    generation_payload,
    project_payload,
    training_run_payload,
)


def _attach_calls(backend) -> list[dict]:
    return [
        r.body
        for r in backend.requests
        if r.method == "POST" and r.path == "/training-runs/t1/datasets"
    ]


@pytest.fixture
def experiment(client, backend):
    backend.route("POST", "/projects", httpx.Response(201, json=project_payload()))
    backend.route(
        "POST", "/projects/p1/experiments", httpx.Response(201, json=experiment_payload())
    )
    backend.route(
        "POST", "/experiments/e1/generations", httpx.Response(201, json=generation_payload())
    )
    backend.route("POST", "/datasets", httpx.Response(201, json=dataset_payload()))
    backend.route(
        "POST", "/datasets/d1/versions", httpx.Response(201, json=dataset_version_payload())
    )
    backend.route("POST", "/generations/g1/datasets", httpx.Response(201, json={}))
    backend.route(
        "POST", "/experiments/e1/training-runs", httpx.Response(201, json=training_run_payload())
    )
    backend.route("POST", "/training-runs/t1/datasets", httpx.Response(201, json={}))
    backend.route(
        "POST",
        "/training-runs/t1/generations",
        httpx.Response(201, json={"generationId": "g1", "trainingRunId": "t1"}),
    )
    backend.route("GET", "/experiments/e1", httpx.Response(200, json=experiment_payload()))
    backend.route(
        "GET",
        "/training-runs/t1",
        httpx.Response(200, json=training_run_payload(datasets=[dataset_version_payload()])),
    )
    backend.route(
        "POST", "/training-runs/t1/evaluations", httpx.Response(201, json=evaluation_payload())
    )
    return client.project("Rain research").experiment("vehicle_detection_rain")


def test_a_generation_remembers_the_datasets_it_recorded(experiment):
    generation = experiment.generation(generator="blender")
    assert generation.datasets == []

    version = generation.dataset(name="rain_v1", uri="s3://bucket/rain_v1")

    assert generation.datasets == [version]
    assert generation.produced_datasets == [version]


def test_an_input_dataset_is_remembered_but_not_treated_as_produced(experiment):
    generation = experiment.generation(generator="blender")

    version = generation.dataset(name="raw", uri="s3://bucket/raw", role="input")

    assert generation.datasets == [version]
    assert generation.produced_datasets == []


def test_training_can_be_created_from_a_generation(experiment, backend):
    generation = experiment.generation(generator="blender")
    generation.dataset(name="rain_v1", uri="s3://bucket/rain_v1")

    experiment.training(model="yolo", framework="pytorch", datasets=[generation])

    assert _attach_calls(backend) == [{"datasetVersionId": "dv1", "role": "training"}]


def test_the_singular_dataset_argument_accepts_a_generation_too(experiment, backend):
    generation = experiment.generation(generator="blender")
    generation.dataset(name="rain_v1", uri="s3://bucket/rain_v1")

    experiment.training(model="yolo", framework="pytorch", dataset=generation)

    assert len(_attach_calls(backend)) == 1


def test_a_generation_with_no_datasets_is_an_error_before_anything_is_created(experiment, backend):
    generation = experiment.generation(generator="blender")

    with pytest.raises(SynthGraphValidationError, match="no datasets recorded"):
        experiment.training(model="yolo", framework="pytorch", datasets=[generation])

    assert not any(r.path == "/experiments/e1/training-runs" for r in backend.requests)


def test_a_dataset_reachable_two_ways_is_attached_once(experiment, backend):
    generation = experiment.generation(generator="blender")
    version = generation.dataset(name="rain_v1", uri="s3://bucket/rain_v1")

    experiment.training(model="yolo", framework="pytorch", datasets=[version, generation])

    assert len(_attach_calls(backend)) == 1


def test_use_links_an_existing_training_run_to_a_generation(experiment, backend):
    generation = experiment.generation(generator="blender")
    generation.dataset(name="rain_v1", uri="s3://bucket/rain_v1")
    backend.route(
        "GET", "/training-runs/t1", httpx.Response(200, json=training_run_payload(datasets=[]))
    )
    training = experiment.training(model="yolo", framework="pytorch")

    # After attaching, the backend reports the dataset on the run.
    backend.route(
        "GET",
        "/training-runs/t1",
        httpx.Response(200, json=training_run_payload(datasets=[dataset_version_payload()])),
    )
    training.use(generation)

    assert _attach_calls(backend) == [{"datasetVersionId": "dv1", "role": "training"}]


def test_use_is_idempotent(experiment, backend):
    generation = experiment.generation(generator="blender")
    generation.dataset(name="rain_v1", uri="s3://bucket/rain_v1")
    backend.route(
        "GET", "/training-runs/t1", httpx.Response(200, json=training_run_payload(datasets=[]))
    )
    training = experiment.training(model="yolo", framework="pytorch")
    backend.route(
        "GET",
        "/training-runs/t1",
        httpx.Response(200, json=training_run_payload(datasets=[dataset_version_payload()])),
    )

    training.use(generation)
    training.use(generation)

    assert len(_attach_calls(backend)) == 1


def test_use_skips_what_the_run_was_created_with(experiment, backend):
    generation = experiment.generation(generator="blender")
    version = generation.dataset(name="rain_v1", uri="s3://bucket/rain_v1")
    training = experiment.training(model="yolo", framework="pytorch", datasets=[version])
    assert len(_attach_calls(backend)) == 1

    training.use(generation)

    assert len(_attach_calls(backend)) == 1


def test_use_accepts_a_bare_dataset_version_id(experiment, backend):
    backend.route(
        "GET", "/training-runs/t1", httpx.Response(200, json=training_run_payload(datasets=[]))
    )
    training = experiment.training(model="yolo", framework="pytorch")

    training.use("dv9")

    assert _attach_calls(backend) == [{"datasetVersionId": "dv9", "role": "training"}]


def test_use_returns_the_handle_so_calls_can_chain(experiment):
    training = experiment.training(model="yolo", framework="pytorch")

    assert training.use() is training


def test_an_evaluation_accepts_the_dataset_version_itself(experiment, backend):
    generation = experiment.generation(generator="blender")
    version = generation.dataset(name="rain_v1", uri="s3://bucket/rain_v1")
    training = experiment.training(model="yolo", framework="pytorch", datasets=[version])

    training.evaluation(metrics={"mAP": 0.7}, dataset_version_id=version)

    body = backend.last().body
    assert "dv1" in body.values()
