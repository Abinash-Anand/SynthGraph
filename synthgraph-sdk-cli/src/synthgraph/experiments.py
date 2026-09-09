from __future__ import annotations

from typing import Any

from .http import SynthGraphHTTPClient
from .models import Experiment
from .routes import Routes
from .serialization import compact, require_identifier, require_mapping, require_text

#: Alias so the return annotation is not shadowed by ``ExperimentsAPI.list``.
ExperimentList = list[Experiment]


class ExperimentsAPI:
    """API operations for SynthGraph experiments."""

    def __init__(self, http: SynthGraphHTTPClient) -> None:
        self._http = http

    def create(
        self,
        *,
        project_id: str,
        name: str,
        description: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> Experiment:
        """Create a new experiment within a project."""
        project_id = require_identifier(project_id, field="project_id")

        payload: dict[str, Any] = compact(
            {
                "name": require_text(name, field="name"),
                "description": description,
                "metadata": (
                    require_mapping(metadata, field="metadata") if metadata is not None else None
                ),
            }
        )

        data = self._http.post(
            Routes.project_experiments(project_id),
            json=payload,
            operation="experiments.create",
        )

        return Experiment.model_validate(data)

    def get(self, experiment_id: str) -> Experiment:
        """Retrieve an experiment by ID."""
        experiment_id = require_identifier(experiment_id, field="experiment_id")

        data = self._http.get(
            Routes.experiment(experiment_id),
            operation="experiments.get",
        )

        return Experiment.model_validate(data)

    def list(
        self,
        *,
        project_id: str,
        search: str | None = None,
    ) -> ExperimentList:
        """List experiments belonging to a project.

        ``search`` is passed through to the backend's ``?search=`` filter
        (spec 29); the SDK does not filter client-side.
        """
        project_id = require_identifier(project_id, field="project_id")

        params: dict[str, Any] = {}
        if search is not None:
            params["search"] = require_text(search, field="search")

        data = self._http.get_list(
            Routes.project_experiments(project_id),
            params=params,
            operation="experiments.list",
        )

        return [Experiment.model_validate(item) for item in data]

    def search(self, *, project_id: str, query: str) -> ExperimentList:
        """Search experiments in a project by name/description."""
        return self.list(project_id=project_id, search=query)
