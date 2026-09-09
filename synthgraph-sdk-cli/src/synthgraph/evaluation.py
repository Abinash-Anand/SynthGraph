"""Evaluation result capture (spec 24).

Metrics are a flexible mapping. The SDK does not know what mAP is, and should
not need a release to learn about a new metric.

The routes used here are flagged UNVERIFIED in CONTRACT.md (spec 63).
"""

from __future__ import annotations

from typing import Any

from .http import SynthGraphHTTPClient
from .models import EvaluationResult
from .routes import Routes
from .serialization import compact, require_identifier, require_mapping

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
        dataset_version_id: str | None = None,
        name: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> EvaluationResult:
        """Record an evaluation of a training run.

        ``dataset_version_id`` names the exact dataset version the model was
        evaluated against, which is what makes the number comparable later.
        """
        training_run_id = require_identifier(training_run_id, field="training_run_id")

        payload = compact(
            {
                "name": name,
                "metrics": require_mapping(metrics, field="metrics"),
                "dataset_version_id": (
                    require_identifier(dataset_version_id, field="dataset_version_id")
                    if dataset_version_id is not None
                    else None
                ),
                "metadata": (
                    require_mapping(metadata, field="metadata") if metadata is not None else None
                ),
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
