# SynthGraph Python SDK

The official Python SDK for SynthGraph.

SynthGraph allows researchers to capture experiment provenance and lineage from
their existing research environments without moving their workflows into the
SynthGraph platform.

## Status

Early development.

The SDK is currently under active development and the public API is not yet
stable.

## Planned v1.0 capabilities

- Project and experiment management
- Synthetic-data generation provenance
- Dataset references
- Training-run provenance
- Evaluation metrics
- Asset references
- Code and environment metadata
- Experiment lineage
- Cloud and self-hosted SynthGraph deployments

## Installation

Install the SDK from the project directory:

```bash
pip install -e .
```

For development:

```bash
pip install -e ".[dev]"
```

## Quick start

A typical SynthGraph workflow is:

```text
Project
  └── Experiment
       └── Generation
```

### Create a project

```python
from synthgraph import SynthGraphClient

with SynthGraphClient(api_key="your-api-key") as client:
    project = client.projects.create(
        name="Synthetic Research",
        description="Synthetic-data research project",
    )

    print(project.id)
    print(project.name)
```

### Create an experiment

Experiments belong to projects:

```python
from synthgraph import SynthGraphClient

with SynthGraphClient(api_key="your-api-key") as client:
    experiment = client.experiments.create(
        project_id="project_123",
        name="Rainy Scene Study",
        description="Study of synthetic rainy-scene generation",
    )

    print(experiment.id)
```

### Record a synthetic-data generation

Use `Generator` to describe the software or tool that produced the result,
and `Reproducibility` to capture information needed to reproduce the run.

```python
from synthgraph import (
    Generator,
    Reproducibility,
    SynthGraphClient,
)

with SynthGraphClient(api_key="your-api-key") as client:
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
        reproducibility=Reproducibility(
            seed=42,
        ),
    )

    print(generation.id)
    print(generation.status)
```

### Record input and output references

Generations can reference assets and datasets without moving the underlying
data into SynthGraph.

```python
from synthgraph import (
    AssetReference,
    DatasetReference,
    Generator,
    Reproducibility,
    SynthGraphClient,
)

input_asset = AssetReference(
    id="asset_123",
    uri="file:///data/model.blend",
    name="model.blend",
    type="3d_model",
)

input_dataset = DatasetReference(
    id="dataset_123",
    uri="s3://bucket/input-scenes",
    name="input-scenes",
    format="image",
)

output_dataset = DatasetReference(
    id="dataset_456",
    uri="s3://bucket/output-scenes",
    name="output-scenes",
    format="image",
)

with SynthGraphClient(api_key="your-api-key") as client:
    generation = client.generations.create(
        experiment_id="experiment_123",
        name="Referenced Generation",
        generator=Generator(name="blender", version="4.2.0"),
        parameters={
            "samples": 512,
        },
        reproducibility=Reproducibility(seed=42),
        inputs=[input_asset, input_dataset],
        outputs=[output_dataset],
    )
```

References contain metadata about the data location and identity. The SDK
does not upload the referenced files or datasets.

## Reading existing resources

Resources can be retrieved by ID.

### Get a project

```python
with SynthGraphClient(api_key="your-api-key") as client:
    project = client.projects.get("project_123")
```

### Get an experiment

```python
with SynthGraphClient(api_key="your-api-key") as client:
    experiment = client.experiments.get("experiment_123")
```

### Get a generation

```python
with SynthGraphClient(api_key="your-api-key") as client:
    generation = client.generations.get("generation_123")
    print(generation.status)
```

## Listing resources

### List experiments

```python
with SynthGraphClient(api_key="your-api-key") as client:
    experiments = client.experiments.list(
        project_id="project_123",
    )

    for experiment in experiments:
        print(experiment.id, experiment.name)
```

### List generations

```python
with SynthGraphClient(api_key="your-api-key") as client:
    generations = client.generations.list(
        experiment_id="experiment_123",
    )

    for generation in generations:
        print(generation.id, generation.status)
```

## Configuration

The client can be configured directly:

```python
from synthgraph import SynthGraphClient

client = SynthGraphClient(
    api_key="your-api-key",
    api_url="https://api.example.com",
    timeout=30.0,
)
```

Or through `SynthGraphConfig`:

```python
from synthgraph import SynthGraphClient, SynthGraphConfig

config = SynthGraphConfig(
    api_key="your-api-key",
    api_url="https://api.example.com",
    timeout=30.0,
)

with SynthGraphClient(config=config) as client:
    project = client.projects.get("project_123")
```

Do not combine `config` with `api_key`, `api_url`, or `timeout` on the same
`SynthGraphClient` instance.

## Development

From this directory:

```bash
pip install -e ".[dev]"
```

Run tests:

```bash
pytest
```

Run linting:

```bash
ruff check .
```

Run type checking:

```bash
mypy src
```

## Current SDK surface

The current public client exposes:

```python
with SynthGraphClient(...) as client:
    client.projects
    client.experiments
    client.generations
```

The SDK currently supports:

- Project creation, retrieval, and listing
- Experiment creation, retrieval, and listing
- Generation creation, retrieval, and listing
- Asset references
- Dataset references
- Generator metadata
- Reproducibility metadata
- HTTP error handling
- Custom API URLs
- Custom HTTP transports for testing

## License

Apache-2.0
