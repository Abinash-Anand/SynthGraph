# SynthGraph Python SDK - Project Handoff Document

## Purpose

This document captures the current state of the SynthGraph Python SDK so a separate SynthGraph backend/API chat can use it as the implementation context.

The SDK is the client-side Python package. It is intended to be installed in a user's Python environment and communicate over HTTPS with a SynthGraph backend API.

Current package version: `0.1.0`

Status: early development, suitable for integration testing, not yet a final v1.0 release.

---

## 1. Current Architecture

The intended relationship is:

```text
User's Python environment
        |
        | pip install synthgraph
        v
SynthGraph Python SDK
        |
        | HTTPS / JSON
        v
SynthGraph Backend API
        |
        +--> Projects
        +--> Experiments
        +--> Generations
        +--> Provenance / lineage data
        +--> Database
```

The SDK should NOT depend on the user's machine hosting the SynthGraph backend.

For local development, the SDK can be installed editable:

```powershell
pip install -e ".[dev]"
```

The eventual public distribution target is PyPI.

---

## 2. Current SDK Capabilities

The SDK currently supports:

### Projects
- Create projects
- Get projects
- List projects

### Experiments
- Create experiments
- Get experiments
- List experiments

### Generation runs
- Create generation runs
- Get a generation
- List generations for an experiment

### Generation lifecycle
- Start a generation
- Complete a generation
- Fail a generation

### References
- `DataReference`
- `AssetReference`
- `DatasetReference`

### Generation provenance
A generation can contain:
- Generator information
- Generator version/type
- Arbitrary generation parameters
- Reproducibility metadata
- Input references
- Output references
- Status
- Timestamps
- Metadata

### HTTP client
- GET object responses
- GET list responses
- POST requests
- PATCH requests
- Bearer-token API-key authentication
- Consistent HTTP errors
- JSON object/list validation
- Context-manager support

---

## 3. Current Source Structure

The SDK currently has this structure:

```text
sdk/
├── src/
│   └── synthgraph/
│       ├── __init__.py
│       ├── client.py
│       ├── config.py
│       ├── experiments.py
│       ├── generations.py
│       ├── http.py
│       ├── projects.py
│       └── models/
│           ├── __init__.py
│           ├── experiment.py
│           ├── generation.py
│           ├── project.py
│           └── reference.py
│
├── tests/
│   ├── test_client.py
│   ├── test_config.py
│   ├── test_experiments.py
│   ├── test_generation.py
│   ├── test_http.py
│   ├── test_models.py
│   ├── test_package.py
│   ├── test_projects.py
│   ├── test_references.py
│   └── test_serialization.py
│
├── pyproject.toml
└── README.md
```

There is intentionally no `src/synthgraph/references.py`. Reference models live under:

```text
src/synthgraph/models/reference.py
```

---

## 4. Public Package Exports

`synthgraph/__init__.py` currently exports:

```python
from .client import SynthGraphClient
from .config import SynthGraphConfig
from .http import SynthGraphHTTPClient, SynthGraphHTTPError
from .models import (
    AssetReference,
    DataReference,
    DatasetReference,
    Experiment,
    GenerationRun,
    GenerationStatus,
    Generator,
    Project,
    Reproducibility,
)
from .projects import ProjectsAPI
```

The public API currently includes:

```text
AssetReference
DataReference
DatasetReference
Experiment
GenerationRun
GenerationStatus
Generator
Project
ProjectsAPI
Reproducibility
SynthGraphClient
SynthGraphConfig
SynthGraphHTTPClient
SynthGraphHTTPError
```

Package version:

```python
__version__ = "0.1.0"
```

---

## 5. Models

### DataReference

Located in `models/reference.py`.

```python
class DataReference(BaseModel):
    model_config = ConfigDict(frozen=True)

    id: str = Field(min_length=1)
    uri: str = Field(min_length=1)
    name: str = Field(min_length=1)
    metadata: dict[str, Any] = Field(default_factory=dict)
```

Purpose: reference to data managed inside or outside SynthGraph.

### AssetReference

Extends `DataReference`:

```python
class AssetReference(DataReference):
    type: str | None = None
```

### DatasetReference

Extends `DataReference`:

```python
class DatasetReference(DataReference):
    format: str | None = None
    size: int | None = Field(default=None, ge=0)
```

### Generator

```python
class Generator(BaseModel):
    model_config = ConfigDict(frozen=True)

    name: str = Field(min_length=1)
    version: str | None = None
    type: str | None = None
```

Represents the tool that produced a generation, e.g. Blender.

### Reproducibility

```python
class Reproducibility(BaseModel):
    model_config = ConfigDict(frozen=True)

    seed: int | None = None
    code_version: str | None = None
    environment: dict[str, Any] = Field(default_factory=dict)
    configuration_hash: str | None = None
```

Important serialization behavior: generation creation excludes `None` values and excludes default values for reproducibility. Therefore:

```python
Reproducibility(seed=42)
```

serializes for a create request as:

```json
{
  "seed": 42
}
```

not as an object containing all default fields.

### GenerationStatus

```python
class GenerationStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
```

### GenerationRun

```python
class GenerationRun(BaseModel):
    model_config = ConfigDict(frozen=True)

    id: str = Field(min_length=1)
    experiment_id: str = Field(min_length=1)
    name: str = Field(min_length=1)
    description: str | None = None

    generator: Generator
    parameters: dict[str, Any]

    reproducibility: Reproducibility

    inputs: list[DataReference] = Field(default_factory=list)
    outputs: list[DataReference] = Field(default_factory=list)

    status: GenerationStatus

    started_at: datetime | None = None
    completed_at: datetime | None = None
    created_at: datetime

    metadata: dict[str, Any] = Field(default_factory=dict)
```

The backend should return generation objects compatible with this shape.

---

## 6. Generation API Contract

The SDK's generation API is exposed through:

```python
client.generations
```

### Create

Current usage:

```python
generation = client.generations.create(
    experiment_id="experiment_123",
    name="Rainy Scene Generation",
    generator=Generator(
        name="blender",
        version="4.2.0",
        type="3d_renderer",
    ),
    parameters={
        "samples": 512,
        "weather": "rain",
    },
    reproducibility=Reproducibility(seed=42),
)
```

The expected HTTP request is:

```text
POST /experiments/{experiment_id}/generations
```

Example payload:

```json
{
  "name": "Rainy Scene Generation",
  "generator": {
    "name": "blender",
    "version": "4.2.0",
    "type": "3d_renderer"
  },
  "parameters": {
    "samples": 512,
    "weather": "rain"
  },
  "reproducibility": {
    "seed": 42
  },
  "inputs": [],
  "outputs": []
}
```

Inputs and outputs default to empty lists.

References can also be supplied.

Example conceptual payload:

```json
{
  "name": "Referenced Generation",
  "generator": {
    "name": "blender"
  },
  "parameters": {},
  "reproducibility": {},
  "inputs": [
    {
      "id": "asset_123",
      "uri": "file:///data/model.blend",
      "name": "model.blend",
      "type": "3d_model",
      "metadata": {}
    },
    {
      "id": "dataset_123",
      "uri": "file:///data/input",
      "name": "input_dataset",
      "format": "image",
      "size": null,
      "metadata": {}
    }
  ],
  "outputs": [
    {
      "id": "dataset_456",
      "uri": "file:///data/output",
      "name": "output_dataset",
      "format": "image",
      "size": null,
      "metadata": {}
    }
  ]
}
```

### Get generation

```python
generation = client.generations.get("generation_123")
```

Expected request:

```text
GET /generations/{generation_id}
```

### List generations

```python
generations = client.generations.list(
    experiment_id="experiment_123",
)
```

Expected request:

```text
GET /experiments/{experiment_id}/generations
```

The SDK supports a JSON array response.

### Lifecycle

Start:

```python
generation = client.generations.start("generation_123")
```

Expected request:

```text
PATCH /generations/generation_123
```

Payload:

```json
{
  "status": "running"
}
```

Complete:

```python
generation = client.generations.complete("generation_123")
```

Payload:

```json
{
  "status": "completed"
}
```

Fail:

```python
generation = client.generations.fail("generation_123")
```

Payload:

```json
{
  "status": "failed"
}
```

The backend should return the updated full `GenerationRun` representation.

---

## 7. HTTP Client Contract

The SDK uses `httpx`.

`SynthGraphHTTPClient` currently supports:

```python
get(path)
get_list(path)
post(path, json=...)
```

and the generation lifecycle implementation also uses PATCH for status updates.

Headers include:

```text
Accept: application/json
Content-Type: application/json
```

If an API key is supplied:

```text
Authorization: Bearer <api_key>
```

Base URL is normalized with trailing `/` removed.

For successful empty object responses, the object handler returns `{}`.

For successful empty list responses, the list handler returns `[]`.

Object endpoints reject non-object JSON responses.

List endpoints reject non-array JSON responses and reject arrays containing non-object values.

Errors are represented by:

```python
SynthGraphHTTPError
```

with:

```python
status_code
message
```

---

## 8. Client Usage

Current public client:

```python
from synthgraph import SynthGraphClient

client = SynthGraphClient(
    api_key="your-api-key",
    api_url="https://api.example.com",
)
```

It exposes:

```python
client.projects
client.experiments
client.generations
```

Context-manager usage:

```python
with SynthGraphClient(
    api_key="your-api-key",
    api_url="https://api.example.com",
) as client:
    generation = client.generations.get("generation_123")
```

Configuration can also be supplied through `SynthGraphConfig`.

The client prevents combining a supplied `config` with direct `api_key`, `api_url`, or `timeout` arguments.

---

## 9. Current Test State

Current SDK test suite:

```text
55 passed
```

Current validation commands:

```powershell
pytest
mypy src
ruff check .
```

All three currently pass.

The tests use `httpx.MockTransport` and therefore validate SDK behavior without requiring a live backend.

This means the SDK is ready for **real integration testing**, but a live backend has not yet been validated by this test suite.

---

## 10. pyproject.toml

Current important configuration:

```toml
[project]
name = "synthgraph"
version = "0.1.0"
description = "Python SDK for SynthGraph experiment provenance and lineage tracking."
readme = "README.md"
requires-python = ">=3.11"
license = { text = "Apache-2.0" }

dependencies = [
    "pydantic>=2.0,<3.0",
    "httpx>=0.27,<1.0",
]
```

Development dependencies:

```text
pytest
pytest-cov
ruff
mypy
```

Build backend:

```text
hatchling
```

The package uses:

```toml
[tool.hatch.build.targets.wheel]
packages = ["src/synthgraph"]
```

Mypy is strict and currently clean.

Ruff line length is 100 and targets Python 3.11.

---

## 11. README Status

The README currently describes:

- SynthGraph Python SDK
- The SDK's purpose
- Early development status
- Planned v1.0 capabilities
- Basic development installation

README usage examples have been added as part of the current SDK work.

The SDK should eventually document a realistic end-to-end example matching the real backend and synthetic-data generation pipeline.

---

## 12. What Is NOT Implemented Yet

The broader planned v1 scope includes:

- Training-run provenance
- Evaluation metrics
- More complete experiment lineage
- Code metadata
- Environment metadata
- More complete cloud/self-hosted deployment support
- Production/API integration hardening
- Public release polish

These do NOT currently block initial integration testing of the generation workflow.

---

## 13. Immediate Goal

The immediate goal is NOT to keep adding SDK features blindly.

The next important milestone is:

```text
Existing SDK
    |
    v
Real SynthGraph backend
    |
    v
Co-founder's actual synthetic-data generation experiment
    |
    v
Real integration test
```

The backend should implement endpoints that match the existing SDK contract.

Do not redesign the SDK/backend independently without checking the existing contract.

---

## 14. Backend Work Needed

The backend chat should first implement enough API surface for the current SDK:

### Projects
- Project creation
- Project retrieval
- Project listing

### Experiments
- Experiment creation
- Experiment retrieval
- Experiment listing

### Generations
- Generation creation
- Generation retrieval
- Generation listing by experiment
- Generation status updates

### Required generation status values

```text
pending
running
completed
failed
```

### Generation response fields

At minimum, the backend should be able to return:

```text
id
experiment_id
name
generator
parameters
reproducibility
inputs
outputs
status
created_at
```

Optional fields supported by the SDK:

```text
description
started_at
completed_at
metadata
```

---

## 15. Important Backend/SDK Integration Constraints

The backend should preserve the SDK's JSON shapes unless there is a deliberate versioned contract change.

For generation creation:

```text
POST /experiments/{experiment_id}/generations
```

For generation retrieval:

```text
GET /generations/{generation_id}
```

For generation listing:

```text
GET /experiments/{experiment_id}/generations
```

For generation lifecycle updates:

```text
PATCH /generations/{generation_id}
```

Status update payloads:

```json
{"status": "running"}
```

```json
{"status": "completed"}
```

```json
{"status": "failed"}
```

The backend should return JSON objects compatible with `GenerationRun`.

List endpoints should return JSON arrays.

---

## 16. Publishing Plan

Do NOT publish publicly merely because local tests pass.

Recommended sequence:

1. Finish current SDK integration contract.
2. Build the backend endpoints.
3. Integrate the SDK with the real backend.
4. Run the co-founder's synthetic-data generation workflow through the SDK.
5. Fix contract mismatches discovered by integration testing.
6. Run:
   ```powershell
   pytest
   mypy src
   ruff check .
   ```
7. Build the package:
   ```powershell
   python -m build
   ```
8. Test the built wheel in a clean virtual environment.
9. Publish to TestPyPI.
10. Verify installation from the built distribution.
11. Publish `0.1.0` to public PyPI when the team is satisfied.

---

## 17. Key Design Principle

SynthGraph is intended to capture provenance and lineage **without forcing researchers to move their existing workflows into the SynthGraph platform**.

The SDK therefore acts as a lightweight client layer that researchers can call from existing Python workflows.

The important real-world test is whether the co-founder's synthetic-data generation experiment can call the SDK and produce useful provenance records in the SynthGraph backend with minimal disruption to the existing workflow.

---

## 18. Backend Chat Handoff Prompt

Use the following as the opening context for the new backend chat:

> We are building the SynthGraph backend that the existing SynthGraph Python SDK communicates with.
>
> The SDK is currently version 0.1.0 and has 55 passing tests, clean mypy, and clean Ruff.
>
> It currently supports:
> - Projects: create/get/list
> - Experiments: create/get/list
> - Generations: create/get/list
> - Generation lifecycle: start/complete/fail
> - DataReference, AssetReference, DatasetReference
> - Generator and Reproducibility metadata
> - HTTP authentication and consistent errors
>
> The most important current API contract is:
>
> `POST /experiments/{experiment_id}/generations`
>
> `GET /generations/{generation_id}`
>
> `GET /experiments/{experiment_id}/generations`
>
> `PATCH /generations/{generation_id}`
>
> Generation statuses are:
> `pending`, `running`, `completed`, `failed`.
>
> Generation responses need to be compatible with the SDK's `GenerationRun` Pydantic model.
>
> The immediate goal is to build a backend that can be tested against the existing SDK and then integrated with our co-founder's real synthetic-data generation experiment.
>
> Do not redesign the SDK contract without first checking the existing SDK implementation and this handoff document.
>
> The broader v1 roadmap includes training-run provenance, evaluation metrics, code/environment metadata, and fuller lineage, but those are not required before the first real SDK/backend integration test.

---

## 19. Current Bottom Line

The SDK is **not just a skeleton anymore**. It has a functioning client architecture, typed models, project/experiment/generation operations, references, lifecycle support, validation, tests, and quality checks.

It is **ready to test against a real backend**.

The most important next task is to make the backend conform to the existing SDK contract and run the actual synthetic-data generation workflow through it.
