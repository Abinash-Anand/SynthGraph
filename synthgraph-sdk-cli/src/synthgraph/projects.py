from __future__ import annotations

from typing import Any

from .http import SynthGraphHTTPClient
from .models import Project
from .routes import Routes
from .serialization import compact, require_identifier, require_mapping, require_text

#: Alias so the return annotation is not shadowed by ``ProjectsAPI.list``.
ProjectList = list[Project]


class ProjectsAPI:
    """API operations for SynthGraph projects."""

    def __init__(self, http: SynthGraphHTTPClient) -> None:
        self._http = http

    def create(
        self,
        *,
        name: str,
        description: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> Project:
        """Create a new SynthGraph project."""
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
            Routes.projects(),
            json=payload,
            operation="projects.create",
        )

        return Project.model_validate(data)

    def get(self, project_id: str) -> Project:
        """Retrieve a SynthGraph project by ID."""
        project_id = require_identifier(project_id, field="project_id")

        data = self._http.get(
            Routes.project(project_id),
            operation="projects.get",
        )

        return Project.model_validate(data)

    def list(self) -> ProjectList:
        """List the projects visible to the authenticated user."""
        data = self._http.get_list(
            Routes.projects(),
            operation="projects.list",
        )

        return [Project.model_validate(item) for item in data]
