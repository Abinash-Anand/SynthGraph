"""SynthGraph - provenance and lineage capture for synthetic-data research.

The SDK captures what a researcher already does; it does not run Blender,
Unity, PyTorch or anything else, and it does not move datasets.
"""

from __future__ import annotations

from ._version import __version__
from .client import SynthGraph, SynthGraphClient
from .config import RetryPolicy, SynthGraphConfig
from .environment import (
    environment_metadata,
    git_metadata,
    installed_packages_metadata,
    resource_metadata,
)
from .errors import (
    SynthGraphAuthenticationError,
    SynthGraphAuthorizationError,
    SynthGraphConfigurationError,
    SynthGraphConflictError,
    SynthGraphCrossProjectReferenceError,
    SynthGraphError,
    SynthGraphHTTPError,
    SynthGraphMetricDirectionConflictError,
    SynthGraphNotFoundError,
    SynthGraphRateLimitError,
    SynthGraphServerError,
    SynthGraphTransportError,
    SynthGraphValidationError,
)
from .fluent import (
    EvaluationHandle,
    ExperimentHandle,
    GenerationHandle,
    ProjectHandle,
    TrainingHandle,
)
from .http import SynthGraphHTTPClient
from .models import (
    Asset,
    AssetReference,
    AssetVersion,
    ComparisonResult,
    DataReference,
    Dataset,
    DatasetReference,
    DatasetVersion,
    Direction,
    EvaluationResult,
    Experiment,
    ExperimentMetricDirections,
    GenerationReference,
    GenerationRun,
    GenerationStatus,
    Generator,
    Project,
    Reproducibility,
    ReproductionManifest,
    TrainingRun,
    TrainingRunMetric,
    User,
)
from .projects import ProjectsAPI

__all__ = [
    "Asset",
    "AssetReference",
    "AssetVersion",
    "ComparisonResult",
    "DataReference",
    "Dataset",
    "DatasetReference",
    "DatasetVersion",
    "Direction",
    "EvaluationHandle",
    "EvaluationResult",
    "Experiment",
    "ExperimentHandle",
    "ExperimentMetricDirections",
    "GenerationHandle",
    "GenerationReference",
    "GenerationRun",
    "GenerationStatus",
    "Generator",
    "Project",
    "ProjectHandle",
    "ProjectsAPI",
    "Reproducibility",
    "ReproductionManifest",
    "RetryPolicy",
    "SynthGraph",
    "SynthGraphAuthenticationError",
    "SynthGraphAuthorizationError",
    "SynthGraphClient",
    "SynthGraphConfig",
    "SynthGraphConfigurationError",
    "SynthGraphConflictError",
    "SynthGraphCrossProjectReferenceError",
    "SynthGraphError",
    "SynthGraphHTTPClient",
    "SynthGraphHTTPError",
    "SynthGraphMetricDirectionConflictError",
    "SynthGraphNotFoundError",
    "SynthGraphRateLimitError",
    "SynthGraphServerError",
    "SynthGraphTransportError",
    "SynthGraphValidationError",
    "TrainingHandle",
    "TrainingRun",
    "TrainingRunMetric",
    "User",
    "__version__",
    "environment_metadata",
    "git_metadata",
    "installed_packages_metadata",
    "resource_metadata",
]
