from typing import Any

from .http import SynthGraphHTTPClient
from .models.generation import GenerationRun, Generator, Reproducibility
from .models.reference import AssetReference, DatasetReference


class GenerationsAPI:
    """API operations for generation runs."""

    def __init__(self, http: SynthGraphHTTPClient) -> None:
        self._http = http

    def create(
        self,
        *,
        experiment_id: str,
        name: str,
        generator: Generator,
        parameters: dict[str, Any],
        reproducibility: Reproducibility,
        inputs: list[str | AssetReference | DatasetReference] | None = None,
        outputs: list[str | AssetReference | DatasetReference] | None = None,
    ) -> GenerationRun:
        """Create a new generation run within an experiment."""
        payload = {
            "name": name,
            "generator": generator.model_dump(
                mode="json",
                exclude_none=True,
            ),
            "parameters": parameters,
            "reproducibility": reproducibility.model_dump(
                mode="json",
                exclude_none=True,
                exclude_defaults=True,
            ),
            "inputs": [
                (
                    reference.model_dump(mode="json")
                    if not isinstance(reference, str)
                    else reference
                )
                for reference in (inputs or [])
            ],
            "outputs": [
                (
                    reference.model_dump(mode="json")
                    if not isinstance(reference, str)
                    else reference
                )
                for reference in (outputs or [])
            ],
        }

        data = self._http.post(
            f"/experiments/{experiment_id}/generations",
            json=payload,
        )

        return GenerationRun.model_validate(data)

    def get(self, generation_id: str) -> GenerationRun:
        """Get a generation run by ID."""
        data = self._http.get(f"/generations/{generation_id}")

        return GenerationRun.model_validate(data)

    def list(self, *, experiment_id: str) -> list[GenerationRun]:
        """List generation runs within an experiment."""
        data = self._http.get_list(
            f"/experiments/{experiment_id}/generations",
        )

        return [GenerationRun.model_validate(item) for item in data]