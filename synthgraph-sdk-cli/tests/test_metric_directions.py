"""Declared metric directions: wire shapes, local validation and the conflict error."""

from __future__ import annotations

import httpx
import pytest

from synthgraph import (
    SynthGraphConflictError,
    SynthGraphMetricDirectionConflictError,
    SynthGraphNotFoundError,
    SynthGraphValidationError,
)

from .conftest import experiment_payload, project_payload, training_run_payload

PATH = "/experiments/e1/metric-directions"
RUNS_PATH = "/experiments/e1/training-runs"


def _directions(**declared: str) -> httpx.Response:
    return httpx.Response(200, json={"experimentId": "e1", "directions": declared})


def _conflict() -> httpx.Response:
    return httpx.Response(
        409,
        json={
            "statusCode": 409,
            "error": "Conflict",
            "code": "metric_direction_conflict",
            "message": (
                'A different direction is already declared for "loss". Nothing was changed.'
            ),
            "conflicts": [{"metricKey": "loss", "declared": "minimize", "requested": "maximize"}],
        },
    )


def test_get_reads_the_declared_directions(client, backend):
    backend.route("GET", PATH, _directions(loss="minimize", accuracy="maximize"))

    declared = client.metric_directions.get("e1")

    assert backend.last().method == "GET"
    assert declared.experiment_id == "e1"
    assert declared.directions == {"loss": "minimize", "accuracy": "maximize"}


def test_get_of_an_experiment_with_nothing_declared_is_empty_not_guessed(client, backend):
    backend.route("GET", PATH, _directions())

    assert client.metric_directions.get("e1").directions == {}


def test_declare_posts_the_mapping(client, backend):
    backend.route("POST", PATH, _directions(loss="minimize", reward="maximize"))

    declared = client.metric_directions.declare("e1", {"loss": "minimize", "reward": "maximize"})

    assert backend.last().method == "POST"
    assert backend.last().body == {"directions": {"loss": "minimize", "reward": "maximize"}}
    assert declared.directions == {"loss": "minimize", "reward": "maximize"}


def test_metric_keys_are_sent_exactly_as_given(client, backend):
    backend.route("POST", PATH, _directions())

    client.metric_directions.declare("e1", {" eval/loss* ": "neutral"})

    assert backend.last().body == {"directions": {" eval/loss* ": "neutral"}}


def test_a_metric_name_never_decides_the_direction(client, backend):
    """Names that look like loss or accuracy are not special: only what is passed is sent."""
    backend.route("POST", PATH, _directions())

    client.metric_directions.declare("e1", {"loss": "maximize", "accuracy": "minimize"})

    assert backend.last().body == {"directions": {"loss": "maximize", "accuracy": "minimize"}}


@pytest.mark.parametrize("bad", ["max", "higher", "MAXIMIZE", "Minimize", "", "up", None, 1])
def test_a_direction_must_be_exactly_one_of_the_three(client, backend, bad):
    with pytest.raises(SynthGraphValidationError, match="must be one of maximize, minimize"):
        client.metric_directions.declare("e1", {"loss": bad})

    assert backend.requests == []


@pytest.mark.parametrize("declarations", [{}, [], None, "loss", [("loss", "minimize")]])
def test_declarations_must_be_a_non_empty_mapping(client, backend, declarations):
    with pytest.raises(SynthGraphValidationError):
        client.metric_directions.declare("e1", declarations)

    assert backend.requests == []


def test_too_many_declarations_are_rejected_before_sending(client, backend):
    many = {f"m{i}": "maximize" for i in range(101)}

    with pytest.raises(SynthGraphValidationError, match="at most 100"):
        client.metric_directions.declare("e1", many)

    assert backend.requests == []


@pytest.mark.parametrize("key", ["", "x" * 201, 5, None])
def test_a_metric_key_must_be_a_string_of_one_to_200_characters(client, backend, key):
    with pytest.raises(SynthGraphValidationError, match="1 to 200 characters"):
        client.metric_directions.declare("e1", {key: "maximize"})

    assert backend.requests == []


def test_a_200_character_key_is_allowed(client, backend):
    backend.route("POST", PATH, _directions())

    client.metric_directions.declare("e1", {"x" * 200: "maximize"})

    assert backend.last().body == {"directions": {"x" * 200: "maximize"}}


def test_blank_experiment_id_is_rejected_before_sending(client, backend):
    with pytest.raises(SynthGraphValidationError):
        client.metric_directions.declare("  ", {"loss": "minimize"})

    assert backend.requests == []


def test_a_conflicting_declaration_raises_a_specific_error_listing_the_clash(client, backend):
    backend.route("POST", PATH, _conflict())

    with pytest.raises(SynthGraphMetricDirectionConflictError) as caught:
        client.metric_directions.declare("e1", {"loss": "maximize"})

    error = caught.value
    assert error.status_code == 409
    assert error.conflicts == [
        {"metric_key": "loss", "declared": "minimize", "requested": "maximize"}
    ]
    assert "Nothing was changed" in error.message


def test_the_conflict_error_is_still_a_conflict_error(client, backend):
    backend.route("POST", PATH, _conflict())

    with pytest.raises(SynthGraphConflictError):
        client.metric_directions.declare("e1", {"loss": "maximize"})


def test_a_conflict_is_not_retried_or_overwritten(client, backend):
    backend.route("POST", PATH, _conflict())

    with pytest.raises(SynthGraphMetricDirectionConflictError):
        client.metric_directions.declare("e1", {"loss": "maximize"})

    assert [r.method for r in backend.requests] == ["POST"]


def test_an_unrelated_409_stays_a_plain_conflict_error(client, backend):
    backend.route("POST", PATH, httpx.Response(409, json={"statusCode": 409, "message": "busy"}))

    with pytest.raises(SynthGraphConflictError) as caught:
        client.metric_directions.declare("e1", {"loss": "maximize"})

    assert not isinstance(caught.value, SynthGraphMetricDirectionConflictError)


def test_declaring_for_another_users_experiment_is_a_not_found_error(client, backend):
    backend.route("POST", PATH, httpx.Response(404, json={"message": "Experiment not found"}))

    with pytest.raises(SynthGraphNotFoundError):
        client.metric_directions.declare("e1", {"loss": "minimize"})


def test_correct_puts_the_key_direction_and_note(client, backend):
    backend.route("PUT", PATH, _directions(loss="minimize"))

    corrected = client.metric_directions.correct(
        "e1", "eval/loss", "minimize", note="declared the wrong way round"
    )

    request = backend.last()
    assert request.method == "PUT"
    assert request.body == {
        "metricKey": "eval/loss",
        "direction": "minimize",
        "correctionNote": "declared the wrong way round",
    }
    assert corrected.directions == {"loss": "minimize"}


@pytest.mark.parametrize("note", ["", "   ", None])
def test_a_correction_requires_a_note(client, backend, note):
    with pytest.raises(SynthGraphValidationError):
        client.metric_directions.correct("e1", "loss", "minimize", note=note)

    assert backend.requests == []


def test_a_correction_note_has_a_length_limit(client, backend):
    with pytest.raises(SynthGraphValidationError, match="at most 1000"):
        client.metric_directions.correct("e1", "loss", "minimize", note="x" * 1001)

    assert backend.requests == []


def test_a_correction_validates_the_direction(client, backend):
    with pytest.raises(SynthGraphValidationError, match="must be one of"):
        client.metric_directions.correct("e1", "loss", "lower", note="why")

    assert backend.requests == []


def test_correcting_an_undeclared_metric_surfaces_the_backend_404(client, backend):
    backend.route(
        "PUT",
        PATH,
        httpx.Response(
            404, json={"message": 'No direction is declared for "loss". Declare it first.'}
        ),
    )

    with pytest.raises(SynthGraphNotFoundError, match="Declare it first"):
        client.metric_directions.correct("e1", "loss", "minimize", note="why")


# -- fluent handle ---------------------------------------------------------


@pytest.fixture
def experiment(client, backend):
    backend.route("POST", "/projects", httpx.Response(201, json=project_payload()))
    backend.route(
        "POST", "/projects/p1/experiments", httpx.Response(201, json=experiment_payload())
    )
    return client.project("Rain research").experiment("vehicle_detection_rain")


def _run_created() -> httpx.Response:
    return httpx.Response(201, json=training_run_payload())


def test_handle_declares_one_metric(experiment, backend):
    backend.route("POST", PATH, _directions(loss="minimize"))

    result = experiment.declare_metric_direction("loss", "minimize")

    assert backend.last().body == {"directions": {"loss": "minimize"}}
    assert result == {"loss": "minimize"}


def test_handle_declares_several_metrics_and_reads_them_back(experiment, backend):
    backend.route("POST", PATH, _directions(loss="minimize", reward="maximize"))
    backend.route("GET", PATH, _directions(loss="minimize", reward="maximize"))

    experiment.declare_metric_directions({"loss": "minimize", "reward": "maximize"})

    assert experiment.metric_directions() == {"loss": "minimize", "reward": "maximize"}


def test_handle_corrects_a_direction(experiment, backend):
    backend.route("PUT", PATH, _directions(loss="minimize"))

    experiment.correct_metric_direction("loss", "minimize", note="was wrong")

    assert backend.last().body["correctionNote"] == "was wrong"


def test_training_declares_directions_before_creating_the_run(experiment, backend):
    backend.route("POST", PATH, _directions(loss="minimize"))
    backend.route("POST", RUNS_PATH, _run_created())

    experiment.training(model="yolo", metric_directions={"loss": "minimize"})

    paths = [r.path for r in backend.requests]
    assert paths.index(PATH) < paths.index(RUNS_PATH)
    # the run payload does not carry the directions: they belong to the experiment
    created = next(r for r in backend.requests if r.path == RUNS_PATH)
    assert "metric_directions" not in created.body
    assert "metricDirections" not in created.body


def test_a_conflicting_declaration_creates_no_training_run(experiment, backend):
    backend.route("POST", PATH, _conflict())
    backend.route("POST", RUNS_PATH, _run_created())

    with pytest.raises(SynthGraphMetricDirectionConflictError):
        experiment.training(model="yolo", metric_directions={"loss": "maximize"})

    assert not any(r.path == RUNS_PATH for r in backend.requests)


def test_an_invalid_declaration_creates_no_training_run(experiment, backend):
    backend.route("POST", RUNS_PATH, _run_created())

    with pytest.raises(SynthGraphValidationError):
        experiment.training(model="yolo", metric_directions={"loss": "better"})

    assert not any(r.path == RUNS_PATH for r in backend.requests)


def test_training_without_directions_never_touches_the_directions_route(experiment, backend):
    backend.route("POST", RUNS_PATH, _run_created())

    experiment.training(model="yolo")

    assert not any(r.path == PATH for r in backend.requests)
