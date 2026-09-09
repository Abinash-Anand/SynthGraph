"""The full researcher workflow (spec 70, level 3).

This is the acceptance test: authenticate, create a project and experiment,
capture a generation with its lifecycle, reference a dataset, record training
and evaluation, then query, filter, compare and export - in one pass, over the
real HTTP layer.
"""

from __future__ import annotations

import json

import httpx
import pytest

from synthgraph import SynthGraph, environment_metadata

from .conftest import API_KEY, API_URL, NOW


@pytest.fixture
def workflow_backend(backend):
    state = {"generation_status": "pending"}

    def generation_body(**overrides):
        payload = {
            "id": "g1",
            "experiment_id": "e1",
            "name": "rain_pass",
            "generator": {"name": "blender", "version": "4.2"},
            "parameters": {"weather": "rain", "occlusion": 0.3},
            "reproducibility": {"seed": 42, "code_version": "deadbeef"},
            "inputs": [{"id": "a1", "uri": "s3://lab/assets/car.blend", "name": "car"}],
            "outputs": [],
            "status": state["generation_status"],
            "created_at": NOW,
        }
        payload.update(overrides)
        return payload

    def patch_generation(request: httpx.Request) -> httpx.Response:
        state["generation_status"] = json.loads(request.content)["status"]
        return httpx.Response(200, json=generation_body())

    backend.route("GET", "/auth/me", httpx.Response(200, json={"id": "u1", "email": "r@lab.edu"}))
    backend.route(
        "POST",
        "/projects",
        httpx.Response(201, json={"id": "p1", "name": "Adverse weather", "created_at": NOW}),
    )
    backend.route(
        "POST",
        "/projects/p1/experiments",
        httpx.Response(
            201,
            json={
                "id": "e1",
                "project_id": "p1",
                "name": "vehicle_detection_rain",
                "created_at": NOW,
            },
        ),
    )
    backend.route(
        "GET",
        "/projects/p1/experiments",
        httpx.Response(
            200,
            json=[
                {
                    "id": "e1",
                    "project_id": "p1",
                    "name": "vehicle_detection_rain",
                    "created_at": NOW,
                }
            ],
        ),
    )
    backend.route(
        "POST",
        "/experiments/e1/generations",
        lambda _request: httpx.Response(201, json=generation_body()),
    )
    backend.route(
        "GET",
        "/experiments/e1/generations",
        lambda _request: httpx.Response(200, json=[generation_body()]),
    )
    backend.route("PATCH", "/generations/g1", patch_generation)
    backend.route(
        "POST",
        "/generations/g1/datasets",
        httpx.Response(
            201,
            json={
                "id": "dv1",
                "dataset_id": "d1",
                "version": "1",
                "uri": "s3://lab/rain_dataset_v1",
                "format": "image",
            },
        ),
    )
    backend.route(
        "POST",
        "/experiments/e1/training-runs",
        httpx.Response(
            201,
            json={
                "id": "t1",
                "experiment_id": "e1",
                "model": "yolo",
                "framework": "pytorch",
                "config": {"epochs": 50},
            },
        ),
    )
    backend.route(
        "POST",
        "/training-runs/t1/evaluation-results",
        httpx.Response(
            201,
            json={
                "id": "ev1",
                "training_run_id": "t1",
                "dataset_version_id": "dv1",
                "metrics": {"mAP": 0.724, "precision": 0.78, "recall": 0.69},
            },
        ),
    )
    backend.route(
        "GET",
        "/generations/g1/reproduction-manifest",
        httpx.Response(
            200,
            json={
                "generation_id": "g1",
                "experiment_id": "e1",
                "generator": {"name": "blender", "version": "4.2"},
                "parameters": {"weather": "rain", "occlusion": 0.3},
                "reproducibility": {"seed": 42, "code_version": "deadbeef"},
                "inputs": [{"id": "a1", "uri": "s3://lab/assets/car.blend"}],
                "outputs": [{"id": "dv1", "uri": "s3://lab/rain_dataset_v1"}],
                "missing": [],
            },
        ),
    )
    backend.route(
        "GET",
        "/generations/g1/documentation",
        httpx.Response(
            200,
            text="# vehicle_detection_rain\n\nBlender 4.2, rain, seed 42.\n",
            headers={"content-type": "text/markdown"},
        ),
    )
    backend.route(
        "POST",
        "/generations/compare",
        httpx.Response(
            200,
            json={
                "generation_ids": ["g1", "g2"],
                "differences": {"parameters": {"weather": {"g1": "rain", "g2": "snow"}}},
            },
        ),
    )
    return backend


def test_end_to_end_researcher_workflow(workflow_backend, tmp_path):
    backend = workflow_backend

    with SynthGraph(api_key=API_KEY, api_url=API_URL, transport=backend.transport) as sg:
        # authenticate
        assert sg.whoami().email == "r@lab.edu"

        # create project and experiment
        project = sg.project("Adverse weather")
        experiment = project.experiment("vehicle_detection_rain")

        # capture a generation, with its lifecycle
        with experiment.generation(
            generator="blender",
            generator_version="4.2",
            parameters={"weather": "rain", "occlusion": 0.3},
            seed=42,
            code_version="deadbeef",
            environment=environment_metadata(),
            inputs=[{"id": "a1", "uri": "s3://lab/assets/car.blend", "name": "car"}],
        ) as generation:
            assert generation.status == "running"

            # reference a dataset without moving it
            dataset = generation.dataset(
                name="rain_dataset_v1",
                uri="s3://lab/rain_dataset_v1",
                format="image",
                version="1",
            )

        assert generation.status == "completed"

        # record training and evaluation
        training = experiment.training(
            model="yolo",
            framework="pytorch",
            dataset=dataset,
            config={"epochs": 50, "batch_size": 32},
        )
        evaluation = training.evaluation(
            metrics={"mAP": 0.724, "precision": 0.78, "recall": 0.69},
            dataset_version_id=dataset.id,
        )
        assert evaluation.metrics["mAP"] == 0.724

        # query and filter
        assert [item.id for item in project.experiments(search="rain")] == ["e1"]
        filtered = experiment.generations(parameters={"weather": "rain"})
        assert [item.id for item in filtered] == ["g1"]

        # compare
        comparison = sg.compare("g1", "g2")
        assert comparison.to_dict()["differences"]["parameters"]["weather"]["g2"] == "snow"

        # export
        manifest = generation.manifest()
        assert manifest.is_complete is True
        (tmp_path / "reproduction.json").write_text(json.dumps(manifest.to_dict(), indent=2))

        documentation = generation.documentation()
        (tmp_path / "experiment.md").write_text(documentation)

    exported = json.loads((tmp_path / "reproduction.json").read_text())
    assert exported["reproducibility"]["seed"] == 42
    assert exported["outputs"][0]["uri"] == "s3://lab/rain_dataset_v1"
    assert "Blender 4.2" in (tmp_path / "experiment.md").read_text()

    # every request carried authentication and no dataset bytes
    for request in backend.requests:
        assert request.headers["authorization"] == f"Bearer {API_KEY}"


def test_workflow_visits_every_expected_route(workflow_backend):
    backend = workflow_backend

    with SynthGraph(api_key=API_KEY, api_url=API_URL, transport=backend.transport) as sg:
        sg.whoami()
        experiment = sg.project("Adverse weather").experiment("vehicle_detection_rain")
        with experiment.generation(generator="blender", parameters={}) as generation:
            generation.dataset(name="d", uri="s3://lab/d")
        training = experiment.training(model="yolo", dataset="dv1")
        training.evaluation(metrics={"mAP": 0.7})
        generation.manifest()
        generation.documentation()
        sg.compare("g1", "g2")

    visited = {(request.method, request.path) for request in backend.requests}
    assert visited == {
        ("GET", "/auth/me"),
        ("POST", "/projects"),
        ("POST", "/projects/p1/experiments"),
        ("POST", "/experiments/e1/generations"),
        ("PATCH", "/generations/g1"),
        ("POST", "/generations/g1/datasets"),
        ("POST", "/experiments/e1/training-runs"),
        ("POST", "/training-runs/t1/evaluation-results"),
        ("GET", "/generations/g1/reproduction-manifest"),
        ("GET", "/generations/g1/documentation"),
        ("POST", "/generations/compare"),
    }
