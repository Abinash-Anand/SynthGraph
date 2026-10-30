"""Project scope checks the SDK can make before it sends anything.

A dataset is used within one project and a training run can only use generations
of its own project (ARCH-004). The backend enforces both. These helpers let the
SDK see the same mismatch first where that is cheap, so a rejected attach does
not leave a new dataset version or a new training run behind. They are developer
experience, not a security boundary: the backend remains the authority, and a
case the SDK cannot see (an older dataset with no recorded project) is still
rejected by the backend.
"""

from __future__ import annotations

from .errors import SynthGraphCrossProjectReferenceError
from .http import SynthGraphHTTPClient
from .models import Experiment, GenerationRun
from .routes import Routes


def cross_project_error(message: str, **details: str) -> SynthGraphCrossProjectReferenceError:
    """The error the backend would answer with, raised before any request is made."""
    return SynthGraphCrossProjectReferenceError(
        409,
        message,
        details={"code": "cross_project_reference", "detected_by": "sdk", **details},
    )


def project_of_experiment(http: SynthGraphHTTPClient, experiment_id: str) -> str:
    data = http.get(Routes.experiment(experiment_id), operation="scope.experiment")
    return Experiment.model_validate(data).project_id


def project_of_generation(http: SynthGraphHTTPClient, generation_id: str) -> str:
    data = http.get(Routes.generation(generation_id), operation="scope.generation")
    return project_of_experiment(http, GenerationRun.model_validate(data).experiment_id)
