"""Model construction, validation and forward compatibility."""

from __future__ import annotations

import datetime as dt

import pytest
from pydantic import ValidationError as PydanticValidationError

from synthgraph.models import (
    Dataset,
    DatasetVersion,
    EvaluationResult,
    Experiment,
    GenerationRun,
    GenerationStatus,
    Generator,
    Project,
    Reproducibility,
    TrainingRun,
    User,
)

from .conftest import NOW, generation_payload


def test_project_parses_snake_case():
    project = Project.model_validate({"id": "p1", "name": "Rain", "created_at": NOW})
    assert project.id == "p1"
    assert isinstance(project.created_at, dt.datetime)


def test_project_parses_camel_case():
    project = Project.model_validate({"id": "p1", "name": "Rain", "createdAt": NOW})
    assert isinstance(project.created_at, dt.datetime)


def test_experiment_parses_camel_case_project_id():
    experiment = Experiment.model_validate(
        {"id": "e1", "projectId": "p1", "name": "rain", "createdAt": NOW}
    )
    assert experiment.project_id == "p1"


def test_models_are_frozen():
    project = Project.model_validate({"id": "p1", "name": "Rain", "created_at": NOW})
    with pytest.raises(PydanticValidationError):
        project.name = "Snow"


def test_unknown_backend_fields_are_preserved():
    """A backend addition must not require an SDK release to be visible."""
    project = Project.model_validate(
        {"id": "p1", "name": "Rain", "created_at": NOW, "organisation_id": "org1"}
    )
    assert project.to_dict()["organisation_id"] == "org1"


def test_required_fields_are_enforced():
    with pytest.raises(PydanticValidationError):
        Project.model_validate({"name": "Rain", "created_at": NOW})


def test_generation_round_trip():
    generation = GenerationRun.model_validate(generation_payload())
    assert generation.status is GenerationStatus.PENDING
    assert generation.generator.name == "blender"
    assert generation.parameters["weather"] == "rain"


def test_generation_status_must_be_known():
    with pytest.raises(PydanticValidationError):
        GenerationRun.model_validate(generation_payload(status="exploded"))


@pytest.mark.parametrize(
    ("status", "terminal"),
    [
        (GenerationStatus.PENDING, False),
        (GenerationStatus.RUNNING, False),
        (GenerationStatus.COMPLETED, True),
        (GenerationStatus.FAILED, True),
    ],
)
def test_terminal_statuses(status, terminal):
    assert status.is_terminal is terminal


def test_seed_is_reachable_from_the_generation():
    generation = GenerationRun.model_validate(generation_payload())
    assert generation.seed == 42
    assert generation.generator_version == "4.2"


def test_reproducibility_omits_unset_fields_on_the_wire():
    payload = Reproducibility(seed=42).model_dump(
        mode="json", exclude_none=True, exclude_defaults=True
    )
    assert payload == {"seed": 42}


def test_generator_requires_a_name():
    with pytest.raises(PydanticValidationError):
        Generator(name="")


def test_dataset_version_size_must_not_be_negative():
    with pytest.raises(PydanticValidationError):
        DatasetVersion(id="dv1", size=-1)


def test_dataset_latest_version():
    dataset = Dataset(
        id="d1",
        name="rain",
        versions=[DatasetVersion(id="dv1"), DatasetVersion(id="dv2")],
    )
    assert dataset.latest_version is not None
    assert dataset.latest_version.id == "dv2"
    assert Dataset(id="d2").latest_version is None


def test_training_run_keeps_config_flexible():
    run = TrainingRun.model_validate(
        {"id": "t1", "model": "yolo", "config": {"epochs": 50, "schedule": {"warmup": 3}}}
    )
    assert run.config["schedule"]["warmup"] == 3


def test_evaluation_metrics_stay_flexible():
    result = EvaluationResult.model_validate(
        {"id": "ev1", "metrics": {"mAP": 0.724, "per_class": {"car": 0.8}}}
    )
    assert result.metrics["per_class"]["car"] == 0.8


def test_user_never_carries_a_key():
    user = User.model_validate({"id": "u1", "email": "a@b.c"})
    assert "api_key" not in user.to_dict()
