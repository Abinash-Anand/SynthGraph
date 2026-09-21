"""Generation capture - the central provenance operation (spec 5, 19, 20)."""

from __future__ import annotations

import json
from typing import Any

from .comparison import ComparisonAPI
from .environment import auto_capture
from .errors import SynthGraphValidationError
from .http import SynthGraphHTTPClient
from .models import (
    ComparisonResult,
    DataReference,
    GenerationRun,
    GenerationStatus,
    Generator,
    Reproducibility,
)
from .routes import Routes
from .serialization import (
    compact,
    require_identifier,
    require_mapping,
    require_sequence,
    require_text,
)

ReferenceInput = str | DataReference | dict[str, Any]

#: Aliases so annotations inside the class body are not shadowed by
#: ``GenerationsAPI.list``.
GenerationList = list[GenerationRun]
ReferenceInputs = list[ReferenceInput]
GenerationIds = list[str]


class GenerationsAPI:
    """API operations for generation runs."""

    def __init__(self, http: SynthGraphHTTPClient) -> None:
        self._http = http

    def create(
        self,
        *,
        experiment_id: str,
        name: str,
        generator: Generator | str,
        parameters: dict[str, Any] | None = None,
        reproducibility: Reproducibility | dict[str, Any] | None = None,
        generator_version: str | None = None,
        generator_type: str | None = None,
        seed: int | None = None,
        code_version: str | None = None,
        environment: dict[str, Any] | None = None,
        capture_environment: bool = True,
        description: str | None = None,
        inputs: ReferenceInputs | None = None,
        outputs: ReferenceInputs | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> GenerationRun:
        """Create a new generation run within an experiment.

        ``generator`` accepts either a :class:`Generator` or a plain name with
        ``generator_version`` / ``generator_type`` alongside it.

        ``seed``, ``code_version`` and ``environment`` are shorthand for the
        matching :class:`Reproducibility` fields; passing both a populated
        ``reproducibility`` and its shorthand for the same field is rejected
        rather than silently resolved.

        When ``environment`` (and any ``reproducibility.environment``) is not
        given, ``environment_metadata()`` and ``git_metadata()`` are captured
        automatically and used to fill it - a caller who explicitly sets
        ``environment`` (directly or via ``reproducibility``) always wins, and
        ``capture_environment=False`` turns this off entirely.
        """
        experiment_id = require_identifier(experiment_id, field="experiment_id")

        resolved_generator = _resolve_generator(
            generator,
            version=generator_version,
            type_=generator_type,
        )
        resolved_reproducibility = _resolve_reproducibility(
            reproducibility,
            seed=seed,
            code_version=code_version,
            environment=environment,
        )

        if capture_environment and not resolved_reproducibility.environment:
            resolved_reproducibility = resolved_reproducibility.model_copy(
                update={"environment": auto_capture()}
            )

        payload: dict[str, Any] = {
            "name": require_text(name, field="name"),
            "generator": resolved_generator.model_dump(
                mode="json",
                exclude_none=True,
            ),
            "parameters": (
                require_mapping(parameters, field="parameters") if parameters is not None else {}
            ),
            "reproducibility": resolved_reproducibility.model_dump(
                mode="json",
                exclude_none=True,
                exclude_defaults=True,
            ),
            "inputs": _normalize_references(inputs, field="inputs"),
            "outputs": _normalize_references(outputs, field="outputs"),
        }

        if description is not None:
            payload["description"] = description
        if metadata is not None:
            payload["metadata"] = require_mapping(metadata, field="metadata")

        data = self._http.post(
            Routes.experiment_generations(experiment_id),
            json=payload,
            operation="generations.create",
        )

        return GenerationRun.model_validate(data)

    def get(self, generation_id: str) -> GenerationRun:
        """Retrieve a generation run by ID."""
        generation_id = require_identifier(generation_id, field="generation_id")

        data = self._http.get(
            Routes.generation(generation_id),
            operation="generations.get",
        )

        return GenerationRun.model_validate(data)

    def list(
        self,
        *,
        experiment_id: str,
        parameters: dict[str, Any] | None = None,
    ) -> GenerationList:
        """List generation runs belonging to an experiment.

        ``parameters`` is sent as the backend's JSON-object ``?parameters=``
        filter (spec 29). Filtering happens on the backend.
        """
        experiment_id = require_identifier(experiment_id, field="experiment_id")

        params: dict[str, Any] = {}
        if parameters is not None:
            params["parameters"] = json.dumps(
                require_mapping(parameters, field="parameters"),
                separators=(",", ":"),
                sort_keys=True,
            )

        data = self._http.get_list(
            Routes.experiment_generations(experiment_id),
            params=params,
            operation="generations.list",
        )

        return [GenerationRun.model_validate(item) for item in data]

    def update(
        self,
        generation_id: str,
        *,
        status: GenerationStatus | str | None = None,
        name: str | None = None,
        description: str | None = None,
        outputs: ReferenceInputs | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> GenerationRun:
        """Patch a generation run.

        Once a generation is running its recorded configuration is history: a
        changed configuration is a new generation, not an edited one (spec 5).
        This method therefore covers lifecycle, naming and outputs, not
        generator or parameters.
        """
        generation_id = require_identifier(generation_id, field="generation_id")

        payload = compact(
            {
                "status": _normalize_status(status),
                "name": name,
                "description": description,
                "outputs": (
                    _normalize_references(outputs, field="outputs")
                    if outputs is not None
                    else None
                ),
                "metadata": (
                    require_mapping(metadata, field="metadata") if metadata is not None else None
                ),
            }
        )

        if not payload:
            raise SynthGraphValidationError("update() requires at least one field to change")

        data = self._http.patch(
            Routes.generation(generation_id),
            json=payload,
            operation="generations.update",
        )

        return GenerationRun.model_validate(data)

    def start(self, generation_id: str) -> GenerationRun:
        """Mark a generation run as running."""
        return self._update_status(generation_id, GenerationStatus.RUNNING)

    def complete(self, generation_id: str) -> GenerationRun:
        """Mark a generation run as completed."""
        return self._update_status(generation_id, GenerationStatus.COMPLETED)

    def fail(self, generation_id: str) -> GenerationRun:
        """Mark a generation run as failed.

        Failed generations are kept: a failed experiment is still a scientific
        record (spec 5).
        """
        return self._update_status(generation_id, GenerationStatus.FAILED)

    def compare(self, generation_ids: GenerationIds) -> ComparisonResult:
        """Compare two or more generations. The backend performs the comparison."""
        return ComparisonAPI(self._http).compare(generation_ids)

    def _update_status(
        self,
        generation_id: str,
        status: GenerationStatus,
    ) -> GenerationRun:
        """Update the lifecycle status of a generation run."""
        generation_id = require_identifier(generation_id, field="generation_id")

        data = self._http.patch(
            Routes.generation(generation_id),
            json={"status": status.value},
            operation=f"generations.{status.value}",
        )

        return GenerationRun.model_validate(data)


def _resolve_generator(
    generator: Generator | str,
    *,
    version: str | None,
    type_: str | None,
) -> Generator:
    """Accept a Generator or a plain name plus optional version/type."""
    if isinstance(generator, Generator):
        if version is not None and generator.version not in (None, version):
            raise SynthGraphValidationError(
                "generator_version conflicts with the version on the Generator object",
                field="generator_version",
            )
        if type_ is not None and generator.type not in (None, type_):
            raise SynthGraphValidationError(
                "generator_type conflicts with the type on the Generator object",
                field="generator_type",
            )
        if version is None and type_ is None:
            return generator
        return Generator(
            name=generator.name,
            version=generator.version or version,
            type=generator.type or type_,
        )

    return Generator(
        name=require_text(generator, field="generator"),
        version=version,
        type=type_,
    )


def _resolve_reproducibility(
    reproducibility: Reproducibility | dict[str, Any] | None,
    *,
    seed: int | None,
    code_version: str | None,
    environment: dict[str, Any] | None,
) -> Reproducibility:
    """Merge the reproducibility object with its keyword shorthands."""
    if reproducibility is None:
        base = Reproducibility()
    elif isinstance(reproducibility, Reproducibility):
        base = reproducibility
    else:
        base = Reproducibility.model_validate(
            require_mapping(reproducibility, field="reproducibility")
        )

    shorthands = {
        "seed": seed,
        "code_version": code_version,
        "environment": environment,
    }
    updates: dict[str, Any] = {}
    for field, value in shorthands.items():
        if value is None:
            continue
        existing = getattr(base, field)
        if existing not in (None, {}) and existing != value:
            raise SynthGraphValidationError(
                f"{field} was given both directly and inside reproducibility with "
                "different values",
                field=field,
            )
        updates[field] = (
            require_mapping(value, field="environment") if field == "environment" else value
        )

    if not updates:
        return base
    return base.model_copy(update=updates)


def _normalize_status(status: GenerationStatus | str | None) -> str | None:
    """Validate a status against the backend's lifecycle vocabulary."""
    if status is None:
        return None
    if isinstance(status, GenerationStatus):
        return status.value
    try:
        return GenerationStatus(status).value
    except ValueError:
        valid = ", ".join(member.value for member in GenerationStatus)
        raise SynthGraphValidationError(
            f"status must be one of: {valid}",
            field="status",
        ) from None


def _normalize_references(
    references: ReferenceInputs | None,
    *,
    field: str,
) -> list[dict[str, Any]]:
    """Turn reference inputs into wire objects.

    A bare string is treated as an existing reference ID. Reference models and
    plain dicts are passed through as JSON. Reference *bytes* are never read or
    transferred (spec 6).
    """
    if references is None:
        return []

    normalized: list[dict[str, Any]] = []
    for index, reference in enumerate(require_sequence(references, field=field)):
        item_field = f"{field}[{index}]"
        if isinstance(reference, str):
            normalized.append({"id": require_identifier(reference, field=item_field)})
        elif isinstance(reference, DataReference):
            normalized.append(reference.model_dump(mode="json", exclude_none=True))
        elif isinstance(reference, dict):
            normalized.append(require_mapping(reference, field=item_field))
        else:
            raise SynthGraphValidationError(
                f"{item_field} must be a reference ID, a reference model or a mapping, "
                f"got {type(reference).__name__}",
                field=item_field,
            )
    return normalized
