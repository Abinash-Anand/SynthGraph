"""Every backend path the SDK knows, in one place.

Routes fall into two groups:

**Verified** - listed in the backend API inventory of the handoff spec (62).

**Unverified** - required by the domain model, but the spec explicitly refuses
to freeze their route names and payloads until the backend controllers are
inspected (63). They follow the same nesting convention as the verified routes:
a collection hangs off its parent, a single resource is addressed at the top
level.

Keeping them here means reconciling the SDK with the real backend is a
single-file change rather than a hunt through the resource modules.
See CONTRACT.md.
"""

from __future__ import annotations

from urllib.parse import quote

__all__ = ["UNVERIFIED_ROUTES", "Routes", "encode_id"]


def encode_id(value: str) -> str:
    """Percent-encode a path segment so an identifier cannot alter the path."""
    return quote(str(value), safe="")


class Routes:
    """Path builders. Every returned path is absolute."""

    # -- verified ----------------------------------------------------------

    @staticmethod
    def auth_me() -> str:
        return "/auth/me"

    @staticmethod
    def projects() -> str:
        return "/projects"

    @staticmethod
    def project(project_id: str) -> str:
        return f"/projects/{encode_id(project_id)}"

    @staticmethod
    def project_experiments(project_id: str) -> str:
        return f"/projects/{encode_id(project_id)}/experiments"

    @staticmethod
    def experiment(experiment_id: str) -> str:
        return f"/experiments/{encode_id(experiment_id)}"

    @staticmethod
    def experiment_generations(experiment_id: str) -> str:
        return f"/experiments/{encode_id(experiment_id)}/generations"

    @staticmethod
    def generation(generation_id: str) -> str:
        return f"/generations/{encode_id(generation_id)}"

    @staticmethod
    def generation_datasets(generation_id: str) -> str:
        return f"/generations/{encode_id(generation_id)}/datasets"

    @staticmethod
    def generation_manifest(generation_id: str) -> str:
        return f"/generations/{encode_id(generation_id)}/reproduction-manifest"

    @staticmethod
    def generation_documentation(generation_id: str) -> str:
        return f"/generations/{encode_id(generation_id)}/documentation"

    @staticmethod
    def generations_compare() -> str:
        return "/generations/compare"

    @staticmethod
    def datasets() -> str:
        return "/datasets"

    @staticmethod
    def dataset_versions(dataset_id: str) -> str:
        return f"/datasets/{encode_id(dataset_id)}/versions"

    @staticmethod
    def assets() -> str:
        return "/assets"

    @staticmethod
    def asset_versions(asset_id: str) -> str:
        return f"/assets/{encode_id(asset_id)}/versions"

    @staticmethod
    def generation_assets(generation_id: str) -> str:
        return f"/generations/{encode_id(generation_id)}/assets"

    @staticmethod
    def experiment_training_runs(experiment_id: str) -> str:
        return f"/experiments/{encode_id(experiment_id)}/training-runs"

    @staticmethod
    def training_run(training_run_id: str) -> str:
        return f"/training-runs/{encode_id(training_run_id)}"

    @staticmethod
    def training_run_datasets(training_run_id: str) -> str:
        return f"/training-runs/{encode_id(training_run_id)}/datasets"

    @staticmethod
    def training_run_evaluations(training_run_id: str) -> str:
        return f"/training-runs/{encode_id(training_run_id)}/evaluations"

    @staticmethod
    def evaluation_result(evaluation_id: str) -> str:
        return f"/evaluation-results/{encode_id(evaluation_id)}"

    # -- unverified (spec 63) ---------------------------------------------
    #
    # (empty - the last entry, generation_assets, was verified and moved to
    # the verified section above; see CONTRACT.md 2.18.)


#: Route builders whose shape the spec has not frozen. Exposed so tests and
#: docs can assert on the set instead of rediscovering it.
UNVERIFIED_ROUTES: frozenset[str] = frozenset()
