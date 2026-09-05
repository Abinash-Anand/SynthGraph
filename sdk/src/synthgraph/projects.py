from typing import Any

from .http import SynthGraphHTTPClient
from .models import Project


class ProjectsAPI:
    """API operations for SynthGraph projects."""

    def __init__(self, http: SynthGraphHTTPClient) -> None:
        self._http = http

    def create(
        self,
        *,
        name: str,
        description: str | None = None,
    ) -> Project:
        """Create a new SynthGraph project."""
        payload: dict[str, Any] = {
            "name": name,
        }

        if description is not None:
            payload["description"] = description

        data = self._http.post(
            "/projects",
            json=payload,
        )

        return Project.model_validate(data)

    def get(self, project_id: str) -> Project:
        """Retrieve a SynthGraph project by ID."""
        data = self._http.get(
            f"/projects/{project_id}",
        )

        return Project.model_validate(data)