"""SynthGraph - provenance and lineage capture for synthetic-data research.

The SDK captures what a researcher already does; it does not run Blender,
Unity, PyTorch or anything else, and it does not move datasets.
"""

from __future__ import annotations

from ._version import __version__
from .client import SynthGraph, SynthGraphClient
from .config import RetryPolicy, SynthGraphConfig
from .environment import environment_metadata, git_metadata, resource_metadata
from .errors import (
    SynthGraphAuthenticationError,
    SynthGraphAuthorizationError,
    SynthGraphConfigurationError,
    SynthGraphConflictError,
    SynthGraphError,
    SynthGraphHTTPError,
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
    EvaluationResult,
    Experiment,
    GenerationRun,
    GenerationStatus,
    Generator,
    Project,
    Reproducibility,
    ReproductionManifest,
    TrainingRun,
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
    "EvaluationHandle",
    "EvaluationResult",
    "Experiment",
    "ExperimentHandle",
    "GenerationHandle",
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
    "SynthGraphError",
    "SynthGraphHTTPClient",
    "SynthGraphHTTPError",
    "SynthGraphNotFoundError",
    "SynthGraphRateLimitError",
    "SynthGraphServerError",
    "SynthGraphTransportError",
    "SynthGraphValidationError",
    "TrainingHandle",
    "TrainingRun",
    "User",
    "__version__",
    "environment_metadata",
    "git_metadata",
    "resource_metadata",
]
