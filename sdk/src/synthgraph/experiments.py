from typing import Any

from .http import SynthGraphHTTPClient
from .models import Experiment


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
    ) -> Experiment:
        """Create a new experiment within a project."""
        payload: dict[str, Any] = {
            "name": name,
        }

        if description is not None:
            payload["description"] = description

        data = self._http.post(
            f"/projects/{project_id}/experiments",
            json=payload,
        )

        return Experiment.model_validate(data)

    def get(self, experiment_id: str) -> Experiment:
        """Retrieve an experiment by ID."""
        data = self._http.get(
            f"/experiments/{experiment_id}",
        )

        return Experiment.model_validate(data)

    def list(self, *, project_id: str) -> list[Experiment]:
        """List experiments belonging to a project."""
        data = self._http.get_list(
            f"/projects/{project_id}/experiments",
        )

        return [
            Experiment.model_validate(item)
            for item in data
        ]