"""The public SynthGraph client (spec 12)."""

from __future__ import annotations

from types import TracebackType
from typing import Any, Self

from .auth import AuthAPI
from .comparison import ComparisonAPI
from .config import SynthGraphConfig
from .datasets import DatasetsAPI
from .documentation import DocumentationAPI
from .errors import SynthGraphConfigurationError
from .evaluation import EvaluationsAPI
from .experiments import ExperimentsAPI
from .fluent import ExperimentHandle, ProjectHandle
from .generations import GenerationsAPI
from .http import SynthGraphHTTPClient
from .models import ComparisonResult, User
from .projects import ProjectsAPI
from .reproduction import ReproductionAPI
from .training import TrainingRunsAPI


class SynthGraphClient:
    """Public client for interacting with the SynthGraph API.

    The client owns configuration, the HTTP transport and the resource APIs.
    It never starts a backend, never assumes one is local, and never requires
    a particular hosting provider (spec 12).
    """

    def __init__(
        self,
        api_key: str | None = None,
        *,
        api_url: str | None = None,
        timeout: float | None = None,
        project_id: str | None = None,
        config: SynthGraphConfig | None = None,
        transport: Any | None = None,
    ) -> None:
        if config is not None:
            if any(value is not None for value in (api_key, api_url, timeout, project_id)):
                raise ValueError(
                    "config cannot be combined with api_key, api_url, timeout or project_id"
                )
            self.config = config
        else:
            self.config = SynthGraphConfig.from_env(
                api_key=api_key,
                api_url=api_url,
                timeout=timeout,
                project_id=project_id,
            )

        self._http = SynthGraphHTTPClient(
            self.config,
            transport=transport,
        )

        self.auth = AuthAPI(self._http)
        self.projects = ProjectsAPI(self._http)
        self.experiments = ExperimentsAPI(self._http)
        self.generations = GenerationsAPI(self._http)
        self.datasets = DatasetsAPI(self._http)
        self.training_runs = TrainingRunsAPI(self._http)
        self.evaluations = EvaluationsAPI(self._http)
        self.reproduction = ReproductionAPI(self._http)
        self.documentation = DocumentationAPI(self._http)
        self.comparisons = ComparisonAPI(self._http)

    # -- fluent capture API ------------------------------------------------

    def project(
        self,
        name: str | None = None,
        *,
        id: str | None = None,
        description: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> ProjectHandle:
        """Create a project by ``name``, or open an existing one by ``id``.

        Exactly one of ``name`` or ``id`` is expected: creating and fetching
        are different intentions and the SDK does not guess between them
        (spec 7.4).
        """
        if (name is None) == (id is None):
            raise SynthGraphConfigurationError(
                "project() takes either a name (to create) or id= (to open), not both"
            )

        if id is not None:
            return ProjectHandle(self, self.projects.get(id))

        assert name is not None
        return ProjectHandle(
            self,
            self.projects.create(name=name, description=description, metadata=metadata),
        )

    def experiment(
        self,
        name: str | None = None,
        *,
        id: str | None = None,
        project_id: str | None = None,
        description: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> ExperimentHandle:
        """Create an experiment by ``name``, or open an existing one by ``id``.

        When creating, the project comes from ``project_id``, then from the
        client's configured default project (``project_id=`` on the constructor
        or ``SYNTHGRAPH_PROJECT_ID``).
        """
        if (name is None) == (id is None):
            raise SynthGraphConfigurationError(
                "experiment() takes either a name (to create) or id= (to open), not both"
            )

        if id is not None:
            return ExperimentHandle(self, self.experiments.get(id))

        resolved_project = project_id or self.config.project_id
        if not resolved_project:
            raise SynthGraphConfigurationError(
                "No project selected. Pass project_id=..., construct the client with "
                "project_id=..., or set SYNTHGRAPH_PROJECT_ID."
            )

        assert name is not None
        return ExperimentHandle(
            self,
            self.experiments.create(
                project_id=resolved_project,
                name=name,
                description=description,
                metadata=metadata,
            ),
        )

    def compare(self, *generation_ids: str) -> ComparisonResult:
        """Compare two or more generations. The backend performs the comparison."""
        ids = list(generation_ids)
        if len(ids) == 1 and isinstance(ids[0], (list, tuple)):
            ids = list(ids[0])
        return self.comparisons.compare(ids)

    def whoami(self) -> User:
        """The account behind the configured API key."""
        return self.auth.me()

    # -- lifecycle ---------------------------------------------------------

    def close(self) -> None:
        """Close the underlying HTTP client."""
        self._http.close()

    def __enter__(self) -> Self:
        return self

    def __exit__(
        self,
        exc_type: type[BaseException] | None,
        exc_value: BaseException | None,
        traceback: TracebackType | None,
    ) -> None:
        self.close()

    def __repr__(self) -> str:
        return f"SynthGraphClient(api_url={self.config.api_url!r})"


#: Short alias matching the style used across the SDK documentation.
SynthGraph = SynthGraphClient
