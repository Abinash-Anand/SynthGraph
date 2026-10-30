"""Evaluation result capture (spec 24).

Metrics are a flexible mapping. The SDK does not know what mAP is, and should
not need a release to learn about a new metric.
"""

from __future__ import annotations

from typing import Any

from .errors import SynthGraphValidationError
from .http import SynthGraphHTTPClient
from .models import EvaluationResult
from .routes import Routes
from .serialization import compact, require_identifier, require_mapping

#: The backend stores the step as a 32-bit integer.
MAX_CHECKPOINT_STEP = 2_147_483_647


def validate_checkpoint_step(value: Any) -> int | None:
    """A checkpoint step is a whole number of training steps, 0 or more.

    ``None`` is allowed and means "not recorded". Nothing is coerced: a float,
    a numeric string or a bool is rejected rather than rounded or reinterpreted.
    """
    if value is None:
        return None
    if isinstance(value, bool) or not isinstance(value, int):
        raise SynthGraphValidationError(
            f"checkpoint_step must be an integer, got {value!r}",
            field="checkpoint_step",
        )
    if not 0 <= value <= MAX_CHECKPOINT_STEP:
        raise SynthGraphValidationError(
            f"checkpoint_step must be between 0 and {MAX_CHECKPOINT_STEP}, got {value}",
            field="checkpoint_step",
        )
    return value


#: Alias so the return annotation is not shadowed by ``EvaluationsAPI.list``.
EvaluationResultList = list[EvaluationResult]


class EvaluationsAPI:
    """API operations for evaluation results."""

    def __init__(self, http: SynthGraphHTTPClient) -> None:
        self._http = http

    def create(
        self,
        *,
        training_run_id: str,
        metrics: dict[str, Any],
        dataset_version_id: str,
        name: str | None = None,
        metadata: dict[str, Any] | None = None,
        checkpoint_step: int | None = None,
    ) -> EvaluationResult:
        """Record an evaluation of a training run.

        ``dataset_version_id`` names the exact dataset version the model was
        evaluated against, which is what makes the number comparable later.
        The backend requires it.

        ``checkpoint_step`` is the training step this evaluation was taken at.
        It is optional and exact: leave it out when you do not know it, and it
        is recorded as not known (it is never worked out from ``name``).
        """
        training_run_id = require_identifier(training_run_id, field="training_run_id")

        payload = compact(
            {
                "name": name,
                "metrics": require_mapping(metrics, field="metrics"),
                "datasetVersionId": require_identifier(
                    dataset_version_id, field="dataset_version_id"
                ),
                "metadata": (
                    require_mapping(metadata, field="metadata") if metadata is not None else None
                ),
                "checkpointStep": validate_checkpoint_step(checkpoint_step),
            }
        )

        data = self._http.post(
            Routes.training_run_evaluations(training_run_id),
            json=payload,
            operation="evaluations.create",
        )

        return EvaluationResult.model_validate(data)

    def get(self, evaluation_id: str) -> EvaluationResult:
        """Retrieve an evaluation result by ID."""
        evaluation_id = require_identifier(evaluation_id, field="evaluation_id")

        data = self._http.get(
            Routes.evaluation_result(evaluation_id),
            operation="evaluations.get",
        )

        return EvaluationResult.model_validate(data)

    def list(self, *, training_run_id: str) -> EvaluationResultList:
        """List evaluation results for a training run."""
        training_run_id = require_identifier(training_run_id, field="training_run_id")

        data = self._http.get_list(
            Routes.training_run_evaluations(training_run_id),
            operation="evaluations.list",
        )

        return [EvaluationResult.model_validate(item) for item in data]
