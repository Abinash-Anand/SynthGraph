"""The recorded link between a training run and the generations it used (ARCH-004).

A run can use generations from other experiments of its own project; a generation
of another project is refused, by the SDK before anything is created where it can
see the mismatch, and by the backend otherwise. Nothing here is inferred.
"""

from __future__ import annotations

import httpx
import pytest

from synthgraph import (
    GenerationHandle,
    GenerationRun,
    SynthGraphConflictError,
    SynthGraphCrossProjectReferenceError,
    SynthGraphValidationError,
)

from .conftest import (
    dataset_payload,
    dataset_version_payload,
    experiment_payload,
    generation_payload,
    project_payload,
    training_run_payload,
)

RUN_GENERATIONS = "/training-runs/t1/generations"


def _link_row(generation_id="g1", **overrides):
    row = {
        "trainingRunId": "t1",
        "generationId": generation_id,
        "generationName": "rain_pass",
        "experimentId": "e1",
        "createdAt": "2026-01-01T00:00:00Z",
    }
    row.update(overrides)
    return row


def _cross_project():
    return httpx.Response(
        409,
        json={
            "statusCode": 409,
            "error": "Conflict",
            "code": "cross_project_reference",
            "message": "This generation belongs to a different project from the training run.",
            "generationId": "g9",
        },
    )


def _posts(backend, path):
    return [r.body for r in backend.requests if r.method == "POST" and r.path == path]


def _paths(backend):
    return [(r.method, r.path) for r in backend.requests]


@pytest.fixture
def experiment(client, backend):
    backend.route("POST", "/projects", httpx.Response(201, json=project_payload()))
    backend.route(
        "POST", "/projects/p1/experiments", httpx.Response(201, json=experiment_payload())
    )
    backend.route("GET", "/experiments/e1", httpx.Response(200, json=experiment_payload()))
    backend.route(
        "POST", "/experiments/e1/generations", httpx.Response(201, json=generation_payload())
    )
    backend.route(
        "POST", "/experiments/e1/training-runs", httpx.Response(201, json=training_run_payload())
    )
    backend.route("GET", "/training-runs/t1", httpx.Response(200, json=training_run_payload()))
    backend.route("POST", RUN_GENERATIONS, httpx.Response(201, json=_link_row()))
    return client.project("Rain research").experiment("vehicle_detection_rain")


# -- models ---------------------------------------------------------------


def test_a_run_reads_back_the_generations_it_used(client, backend):
    backend.route(
        "GET",
        "/training-runs/t1",
        httpx.Response(
            200,
            json=training_run_payload(
                generationReferences=[
                    {
                        "generationId": "g1",
                        "generationName": "rain_pass",
                        "experimentId": "e2",
                        "createdAt": "2026-01-01T00:00:00Z",
                    }
                ]
            ),
        ),
    )

    run = client.training_runs.get("t1")

    assert [
        (r.generation_id, r.generation_name, r.experiment_id) for r in run.generation_references
    ] == [("g1", "rain_pass", "e2")]


def test_a_backend_that_predates_the_link_reads_as_none_recorded(client, backend):
    backend.route("GET", "/training-runs/t1", httpx.Response(200, json=training_run_payload()))

    assert client.training_runs.get("t1").generation_references == []


def test_a_dataset_reads_back_its_project(client, backend):
    backend.route(
        "GET",
        "/datasets/d1",
        httpx.Response(200, json={"id": "d1", "name": "x", "projectId": "p1"}),
    )
    backend.route("GET", "/datasets/d2", httpx.Response(200, json={"id": "d2", "name": "y"}))

    assert client.datasets.get("d1").project_id == "p1"
    assert client.datasets.get("d2").project_id is None


# -- the API --------------------------------------------------------------


def test_add_generation_posts_the_generation_id(client, backend):
    backend.route("POST", RUN_GENERATIONS, httpx.Response(201, json=_link_row()))

    reference = client.training_runs.add_generation(training_run_id="t1", generation="g1")

    assert backend.last().body == {"generationId": "g1"}
    assert reference.generation_id == "g1"
    assert reference.training_run_id == "t1"


def test_add_generation_accepts_a_generation_model(client, backend):
    backend.route("POST", RUN_GENERATIONS, httpx.Response(201, json=_link_row()))
    generation = GenerationRun.model_validate(generation_payload())

    client.training_runs.add_generation(training_run_id="t1", generation=generation)

    assert backend.last().body == {"generationId": "g1"}


@pytest.mark.parametrize("bad", ["", "  ", None])
def test_add_generation_needs_a_real_id_and_sends_nothing_otherwise(client, backend, bad):
    with pytest.raises(SynthGraphValidationError):
        client.training_runs.add_generation(training_run_id="t1", generation=bad)

    assert backend.requests == []


def test_a_duplicate_is_a_plain_conflict_error(client, backend):
    backend.route(
        "POST",
        RUN_GENERATIONS,
        httpx.Response(
            409,
            json={"statusCode": 409, "message": "Training run generation reference already exists"},
        ),
    )

    with pytest.raises(SynthGraphConflictError) as caught:
        client.training_runs.add_generation(training_run_id="t1", generation="g1")

    assert not isinstance(caught.value, SynthGraphCrossProjectReferenceError)


def test_the_backends_cross_project_409_is_a_specific_error(client, backend):
    backend.route("POST", RUN_GENERATIONS, _cross_project())

    with pytest.raises(SynthGraphCrossProjectReferenceError) as caught:
        client.training_runs.add_generation(training_run_id="t1", generation="g9")

    assert isinstance(caught.value, SynthGraphConflictError)
    assert caught.value.status_code == 409
    assert caught.value.details["code"] == "cross_project_reference"
    assert "different project" in caught.value.message


def test_generations_lists_the_recorded_links(client, backend):
    backend.route(
        "GET",
        RUN_GENERATIONS,
        httpx.Response(200, json=[_link_row("g1"), _link_row("g2", generationName="other")]),
    )

    references = client.training_runs.generations(training_run_id="t1")

    assert [r.generation_id for r in references] == ["g1", "g2"]
    assert references[1].generation_name == "other"


# -- use(generation) ------------------------------------------------------


def test_use_records_the_generation_and_attaches_what_it_produced(experiment, backend):
    backend.route("POST", "/datasets", httpx.Response(201, json=dataset_payload()))
    backend.route(
        "POST", "/datasets/d1/versions", httpx.Response(201, json=dataset_version_payload())
    )
    backend.route("POST", "/generations/g1/datasets", httpx.Response(201, json={}))
    backend.route("POST", "/training-runs/t1/datasets", httpx.Response(201, json={}))
    generation = experiment.generation(generator="blender")
    generation.dataset(name="rain_v1", uri="s3://bucket/rain_v1")
    training = experiment.training(model="yolo", framework="pytorch")

    training.use(generation)

    assert _posts(backend, RUN_GENERATIONS) == [{"generationId": "g1"}]
    assert _posts(backend, "/training-runs/t1/datasets") == [
        {"datasetVersionId": "dv1", "role": "training"}
    ]


def test_use_links_a_generation_that_produced_no_dataset(experiment, backend):
    """Simulator-driven training: there is no dataset to link through, so the link
    to the generation itself is what is recorded (this used to be an error)."""
    generation = experiment.generation(generator="isaaclab")
    training = experiment.training(model="ppo", framework="rl")

    training.use(generation)

    assert _posts(backend, RUN_GENERATIONS) == [{"generationId": "g1"}]
    assert _posts(backend, "/training-runs/t1/datasets") == []


def test_use_does_not_repeat_a_link_the_run_already_has(experiment, backend):
    generation = experiment.generation(generator="isaaclab")
    backend.route(
        "GET",
        "/training-runs/t1",
        httpx.Response(
            200,
            json=training_run_payload(
                generationReferences=[
                    {"generationId": "g1", "generationName": "rain_pass", "experimentId": "e1"}
                ]
            ),
        ),
    )
    training = experiment.training(model="ppo", framework="rl")
    training.refresh()

    training.use(generation)

    assert _posts(backend, RUN_GENERATIONS) == []


def test_use_treats_an_already_recorded_link_as_done(experiment, backend):
    generation = experiment.generation(generator="isaaclab")
    training = experiment.training(model="ppo", framework="rl")
    backend.route(
        "POST",
        RUN_GENERATIONS,
        httpx.Response(
            409,
            json={"statusCode": 409, "message": "Training run generation reference already exists"},
        ),
    )

    result = training.use(generation)

    assert result is training


def test_use_refuses_a_generation_of_another_project_before_linking_anything(experiment, backend):
    generation = experiment.generation(generator="isaaclab")
    training = experiment.training(model="ppo", framework="rl")
    # A second generation whose experiment is in another project.
    other = GenerationHandle(
        experiment._client,
        GenerationRun.model_validate(generation_payload(id="g8", experiment_id="e9")),
    )
    backend.route(
        "GET",
        "/experiments/e9",
        httpx.Response(200, json=experiment_payload(id="e9", project_id="p9")),
    )
    before = len(backend.requests)

    with pytest.raises(SynthGraphCrossProjectReferenceError) as caught:
        training.use(generation, other)

    sent = _paths(backend)[before:]
    assert not any(method == "POST" for method, _ in sent)
    assert caught.value.details["detected_by"] == "sdk"
    assert caught.value.details["code"] == "cross_project_reference"


def test_use_still_attaches_a_dataset_version_id(experiment, backend):
    backend.route("POST", "/training-runs/t1/datasets", httpx.Response(201, json={}))
    training = experiment.training(model="ppo", framework="rl")

    training.use("dv1")

    assert _posts(backend, "/training-runs/t1/datasets") == [
        {"datasetVersionId": "dv1", "role": "training"}
    ]
    assert _posts(backend, RUN_GENERATIONS) == []


# -- link_generation / generations ---------------------------------------


def test_link_generation_takes_an_id_and_looks_up_where_it_lives(experiment, backend):
    backend.route(
        "GET",
        "/generations/g5",
        httpx.Response(200, json=generation_payload(id="g5", experiment_id="e7")),
    )
    backend.route(
        "GET",
        "/experiments/e7",
        httpx.Response(200, json=experiment_payload(id="e7", project_id="p1")),
    )
    backend.route(
        "POST", RUN_GENERATIONS, httpx.Response(201, json=_link_row("g5", experimentId="e7"))
    )
    training = experiment.training(model="ppo", framework="rl")

    training.link_generation("g5")

    assert _posts(backend, RUN_GENERATIONS) == [{"generationId": "g5"}]


def test_link_generation_refuses_another_projects_generation_by_id(experiment, backend):
    backend.route(
        "GET",
        "/generations/g5",
        httpx.Response(200, json=generation_payload(id="g5", experiment_id="e7")),
    )
    backend.route(
        "GET",
        "/experiments/e7",
        httpx.Response(200, json=experiment_payload(id="e7", project_id="p2")),
    )
    training = experiment.training(model="ppo", framework="rl")

    with pytest.raises(SynthGraphCrossProjectReferenceError):
        training.link_generation("g5")

    assert _posts(backend, RUN_GENERATIONS) == []


def test_generations_reads_the_links_back(experiment, backend):
    backend.route("GET", RUN_GENERATIONS, httpx.Response(200, json=[_link_row()]))
    training = experiment.training(model="ppo", framework="rl")

    assert [r.generation_id for r in training.generations()] == ["g1"]


# -- training(generations=...) -------------------------------------------


def test_training_records_the_generations_after_creating_the_run(experiment, backend):
    generation = experiment.generation(generator="isaaclab")

    experiment.training(model="ppo", framework="rl", generations=[generation])

    paths = _paths(backend)
    assert paths.index(("POST", "/experiments/e1/training-runs")) < paths.index(
        ("POST", RUN_GENERATIONS)
    )
    assert _posts(backend, RUN_GENERATIONS) == [{"generationId": "g1"}]


def test_training_accepts_a_generation_from_another_experiment_of_the_project(experiment, backend):
    backend.route(
        "GET",
        "/generations/g5",
        httpx.Response(200, json=generation_payload(id="g5", experiment_id="e7")),
    )
    backend.route(
        "GET",
        "/experiments/e7",
        httpx.Response(200, json=experiment_payload(id="e7", project_id="p1")),
    )
    backend.route("POST", RUN_GENERATIONS, httpx.Response(201, json=_link_row("g5")))

    experiment.training(model="ppo", framework="rl", generations=["g5"])

    assert _posts(backend, RUN_GENERATIONS) == [{"generationId": "g5"}]


def test_a_generation_of_another_project_creates_no_run(experiment, backend):
    backend.route(
        "GET",
        "/generations/g5",
        httpx.Response(200, json=generation_payload(id="g5", experiment_id="e7")),
    )
    backend.route(
        "GET",
        "/experiments/e7",
        httpx.Response(200, json=experiment_payload(id="e7", project_id="p2")),
    )
    before = len(backend.requests)

    with pytest.raises(SynthGraphCrossProjectReferenceError):
        experiment.training(model="ppo", framework="rl", generations=["g5"])

    assert not any(method == "POST" for method, _ in _paths(backend)[before:]), (
        "no run, no directions and no link may be created"
    )


def test_the_same_generation_twice_is_linked_once(experiment, backend):
    generation = experiment.generation(generator="isaaclab")

    experiment.training(model="ppo", framework="rl", generations=[generation, "g1", generation])

    assert _posts(backend, RUN_GENERATIONS) == [{"generationId": "g1"}]


@pytest.mark.parametrize("bad", [5, "", ["g1", 7]])
def test_something_that_is_not_a_generation_is_rejected_before_anything_is_sent(
    experiment, backend, bad
):
    before = len(backend.requests)

    with pytest.raises(SynthGraphValidationError):
        experiment.training(model="ppo", framework="rl", generations=bad)

    assert len(backend.requests) == before


def test_passing_a_generation_as_a_dataset_source_does_not_link_it(experiment, backend):
    """``datasets=[generation]`` stays a statement about data; the link to a
    generation is made with ``generations=`` or ``use()``."""
    backend.route("POST", "/datasets", httpx.Response(201, json=dataset_payload()))
    backend.route(
        "POST", "/datasets/d1/versions", httpx.Response(201, json=dataset_version_payload())
    )
    backend.route("POST", "/generations/g1/datasets", httpx.Response(201, json={}))
    backend.route("POST", "/training-runs/t1/datasets", httpx.Response(201, json={}))
    generation = experiment.generation(generator="blender")
    generation.dataset(name="rain_v1", uri="s3://bucket/rain_v1")

    experiment.training(model="yolo", framework="pytorch", datasets=[generation])

    assert _posts(backend, RUN_GENERATIONS) == []


# -- dataset reuse: look before creating a version -----------------------


def _dataset_routes(
    backend, *, project_id=None, generation_experiment="e1", experiment_project="p1"
):
    dataset = {"id": "d1", "name": "rain"}
    if project_id is not None:
        dataset["projectId"] = project_id
    backend.route("GET", "/datasets/d1", httpx.Response(200, json=dataset))
    backend.route(
        "GET",
        "/generations/g1",
        httpx.Response(200, json=generation_payload(experiment_id=generation_experiment)),
    )
    backend.route(
        "GET",
        f"/experiments/{generation_experiment}",
        httpx.Response(
            200, json=experiment_payload(id=generation_experiment, project_id=experiment_project)
        ),
    )
    backend.route(
        "POST", "/datasets/d1/versions", httpx.Response(201, json=dataset_version_payload())
    )
    backend.route("POST", "/generations/g1/datasets", httpx.Response(201, json={}))


def test_reusing_another_projects_dataset_creates_no_version(client, backend):
    _dataset_routes(backend, project_id="p9")

    with pytest.raises(SynthGraphCrossProjectReferenceError) as caught:
        client.datasets.create(generation_id="g1", name="rain", uri="s3://b/r", dataset_id="d1")

    assert caught.value.details["detected_by"] == "sdk"
    assert caught.value.details["dataset_id"] == "d1"
    assert not any(method == "POST" for method, _ in _paths(backend))


def test_reusing_a_dataset_of_the_same_project_goes_ahead(client, backend):
    _dataset_routes(backend, project_id="p1")

    version = client.datasets.create(
        generation_id="g1", name="rain", uri="s3://b/r", dataset_id="d1"
    )

    assert version.id == "dv1"
    assert ("POST", "/datasets/d1/versions") in _paths(backend)


def test_reuse_from_another_experiment_of_the_same_project_goes_ahead(client, backend):
    _dataset_routes(backend, project_id="p1", generation_experiment="e4", experiment_project="p1")

    client.datasets.create(generation_id="g1", name="rain", uri="s3://b/r", dataset_id="d1")

    assert ("POST", "/generations/g1/datasets") in _paths(backend)


def test_a_dataset_with_no_recorded_project_is_left_to_the_backend(client, backend):
    _dataset_routes(backend, project_id=None)

    client.datasets.create(generation_id="g1", name="rain", uri="s3://b/r", dataset_id="d1")

    # No look at the generation's project: nothing to compare against.
    assert ("GET", "/generations/g1") not in _paths(backend)


def test_the_backend_has_the_last_word_on_an_unscoped_dataset(client, backend):
    _dataset_routes(backend, project_id=None)
    backend.route("POST", "/generations/g1/datasets", _cross_project())

    with pytest.raises(SynthGraphCrossProjectReferenceError) as caught:
        client.datasets.create(generation_id="g1", name="rain", uri="s3://b/r", dataset_id="d1")

    assert "detected_by" not in caught.value.details


def test_a_new_dataset_needs_no_extra_lookups(client, backend):
    backend.route("POST", "/datasets", httpx.Response(201, json=dataset_payload()))
    backend.route(
        "POST", "/datasets/d1/versions", httpx.Response(201, json=dataset_version_payload())
    )
    backend.route("POST", "/generations/g1/datasets", httpx.Response(201, json={}))

    client.datasets.create(generation_id="g1", name="rain", uri="s3://b/r")

    assert not any(method == "GET" for method, _ in _paths(backend))
