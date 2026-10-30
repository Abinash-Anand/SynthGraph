from __future__ import annotations

from collections.abc import Mapping
from typing import Any

from .errors import (
    SynthGraphConflictError,
    SynthGraphMetricDirectionConflictError,
    SynthGraphValidationError,
)
from .http import SynthGraphHTTPClient
from .models import ExperimentMetricDirections
from .models.metric_directions import DIRECTIONS
from .routes import Routes
from .serialization import require_identifier, require_text

#: The backend's limits (see the metric-directions contract). They are checked
#: here too so a bad request fails before it is sent, with the same wording.
MAX_DECLARATIONS_PER_REQUEST = 100
MAX_METRIC_KEY_LENGTH = 200
MAX_CORRECTION_NOTE_LENGTH = 1000

_CONFLICT_CODE = "metric_direction_conflict"


def validate_direction(value: Any, *, field: str) -> str:
    """A direction must be exactly ``maximize``, ``minimize`` or ``neutral``.

    Nothing is normalised or aliased ("max", "higher", "MAXIMIZE" are all
    rejected): a declaration is metadata about what a metric means, so it must
    be stated, not interpreted.
    """
    if not isinstance(value, str) or value not in DIRECTIONS:
        raise SynthGraphValidationError(
            f"{field} must be one of {', '.join(DIRECTIONS)}, got {value!r}",
            field=field,
        )
    return value


def validate_metric_key(value: Any, *, field: str = "metric_key") -> str:
    """A metric key is used exactly as given: no trimming, no patterns."""
    if not isinstance(value, str) or not 1 <= len(value) <= MAX_METRIC_KEY_LENGTH:
        raise SynthGraphValidationError(
            f"{field} must be a string of 1 to {MAX_METRIC_KEY_LENGTH} characters",
            field=field,
        )
    return value


def validate_declarations(directions: Any) -> dict[str, str]:
    """Validate a ``{metric_key: direction}`` mapping before anything is sent."""
    if not isinstance(directions, Mapping):
        raise SynthGraphValidationError(
            f"directions must be a mapping of metric keys to a direction, "
            f"got {type(directions).__name__}",
            field="directions",
        )
    if not directions:
        raise SynthGraphValidationError(
            "directions must declare at least one metric", field="directions"
        )
    if len(directions) > MAX_DECLARATIONS_PER_REQUEST:
        raise SynthGraphValidationError(
            f"directions can declare at most {MAX_DECLARATIONS_PER_REQUEST} metrics per call",
            field="directions",
        )

    checked: dict[str, str] = {}
    for key, direction in directions.items():
        checked[validate_metric_key(key, field="directions key")] = validate_direction(
            direction, field=f"direction for {key!r}"
        )
    return checked


def _conflicts_from(details: Any) -> list[dict[str, str]] | None:
    """The backend's conflict list, or ``None`` if this 409 is not a direction conflict."""
    if not isinstance(details, dict) or details.get("code") != _CONFLICT_CODE:
        return None
    raw = details.get("conflicts")
    if not isinstance(raw, list):
        return None
    conflicts = []
    for item in raw:
        if not isinstance(item, dict):
            continue
        conflicts.append(
            {
                "metric_key": str(item.get("metricKey", "")),
                "declared": str(item.get("declared", "")),
                "requested": str(item.get("requested", "")),
            }
        )
    return conflicts


class MetricDirectionsAPI:
    """Declared metric directions, per experiment.

    A direction says whether a bigger or smaller value of a metric is better. It
    is declared by whoever logs the metric, is consistent within an experiment,
    and is never inferred from the metric's name. A metric nobody declared has no
    direction.
    """

    def __init__(self, http: SynthGraphHTTPClient) -> None:
        self._http = http

    def get(self, experiment_id: str) -> ExperimentMetricDirections:
        """The directions declared so far in an experiment."""
        experiment_id = require_identifier(experiment_id, field="experiment_id")

        data = self._http.get(
            Routes.experiment_metric_directions(experiment_id),
            operation="metric_directions.get",
        )
        return ExperimentMetricDirections.model_validate(data)

    def declare(
        self, experiment_id: str, directions: Mapping[str, str]
    ) -> ExperimentMetricDirections:
        """Declare directions for an experiment's metrics, all or nothing.

        Declaring a metric again with the *same* direction changes nothing.
        Declaring a *different* direction for a metric that already has one raises
        :class:`SynthGraphMetricDirectionConflictError` and declares none of the
        metrics in this call: there is no last-write-wins. To change a declared
        direction on purpose, use :meth:`correct`.
        """
        experiment_id = require_identifier(experiment_id, field="experiment_id")
        payload = {"directions": validate_declarations(directions)}

        operation = "metric_directions.declare"
        path = Routes.experiment_metric_directions(experiment_id)
        try:
            data = self._http.post(path, json=payload, operation=operation)
        except SynthGraphConflictError as exc:
            conflicts = _conflicts_from(exc.details)
            if conflicts is None:
                raise
            raise SynthGraphMetricDirectionConflictError(
                exc.status_code,
                exc.message,
                conflicts=conflicts,
                operation=operation,
                path=path,
                details=exc.details,
            ) from exc
        return ExperimentMetricDirections.model_validate(data)

    def correct(
        self, experiment_id: str, metric_key: str, direction: str, *, note: str
    ) -> ExperimentMetricDirections:
        """Explicitly correct a direction that was declared before.

        The backend records when the correction was made and the note, and only
        corrects a metric that already has a declaration (a metric with none is
        declared with :meth:`declare`). The ``note`` says why the earlier
        declaration was wrong.
        """
        experiment_id = require_identifier(experiment_id, field="experiment_id")
        note = require_text(note, field="note")
        if len(note) > MAX_CORRECTION_NOTE_LENGTH:
            raise SynthGraphValidationError(
                f"note must be at most {MAX_CORRECTION_NOTE_LENGTH} characters",
                field="note",
            )

        data = self._http.put(
            Routes.experiment_metric_directions(experiment_id),
            json={
                "metricKey": validate_metric_key(metric_key),
                "direction": validate_direction(direction, field="direction"),
                "correctionNote": note,
            },
            operation="metric_directions.correct",
        )
        return ExperimentMetricDirections.model_validate(data)
