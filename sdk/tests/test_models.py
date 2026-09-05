from datetime import UTC, datetime

import pytest
from pydantic import ValidationError

from synthgraph import Experiment, Project


def test_project_creation() -> None:
    now = datetime.now(UTC)

    project = Project(
        id="proj_123",
        name="Synthetic Autonomous Driving",
        created_at=now,
        updated_at=now,
    )

    assert project.id == "proj_123"
    assert project.name == "Synthetic Autonomous Driving"
    assert project.description is None


def test_project_rejects_empty_name() -> None:
    now = datetime.now(UTC)

    with pytest.raises(ValidationError):
        Project(
            id="proj_123",
            name="",
            created_at=now,
            updated_at=now,
        )


def test_experiment_creation() -> None:
    now = datetime.now(UTC)

    experiment = Experiment(
        id="exp_123",
        project_id="proj_123",
        name="Rainy Conditions",
        created_at=now,
        updated_at=now,
    )

    assert experiment.id == "exp_123"
    assert experiment.project_id == "proj_123"


def test_project_is_immutable() -> None:
    now = datetime.now(UTC)

    project = Project(
        id="proj_123",
        name="Test",
        created_at=now,
        updated_at=now,
    )

    with pytest.raises(ValidationError):
        project.name = "Changed"