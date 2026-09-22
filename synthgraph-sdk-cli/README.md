# SynthGraph Python SDK + CLI

Provenance and lineage capture for synthetic-data and RL research.

SynthGraph records the metadata *around* your research — what generated a
dataset, with which parameters, which data trained which model, and what that
model scored — so experiments stay traceable and reproducible. You keep working
in Blender, Unity, Isaac Lab, PyTorch, notebooks and scripts exactly as you do
now.

Two interfaces, one system:

| | Purpose |
|---|---|
| **Python SDK** | Capture provenance from inside your existing workflow |
| **CLI** | Query, inspect, compare and export provenance afterwards |

The backend is the system of record. Both are clients.

## What this is not

It does not generate synthetic data, train models, or run Blender, Unity,
Isaac Lab or PyTorch. It does not upload your datasets: a dataset reference is
a URI and some metadata, and your hundred-gigabyte render stays exactly where
you put it.

## Install

```bash
pip install synthgraph-sdk
```

Requires Python 3.11+. For local resource-metric capture (CPU/memory
percentages, on top of the CPU-count and GPU stats that need no extra
dependency), add the `resource` extra:

```bash
pip install "synthgraph-sdk[resource]"
```

Framework integrations (below) assume you already have the corresponding
library installed — `synthgraph-sdk` never pulls in stable-baselines3, skrl,
rl_games, Isaac Lab, MuJoCo Playground or wandb on your behalf.

## Configure

```bash
export SYNTHGRAPH_API_KEY="..."
export SYNTHGRAPH_API_URL="https://synthgraph.onrender.com"  # or your own backend
export SYNTHGRAPH_PROJECT_ID="..."                           # optional default project
```

`SYNTHGRAPH_API_URL` also accepts the alias `SYNTHGRAPH_BASE_URL`. Two other
optional knobs: `SYNTHGRAPH_TIMEOUT` (request timeout in seconds, default 30)
and `SYNTHGRAPH_MAX_ATTEMPTS` (retry attempts for safe requests, default 3).

Configuration resolves in this order: explicit arguments, then environment,
then defaults. The API key is never logged, never serialized into a model or a
manifest, and never placed in an exception message.

## Capture (SDK)

```python
from synthgraph import SynthGraph

with SynthGraph() as sg:                      # api_key from the environment
    project = sg.project("Adverse weather detection")
    experiment = project.experiment("vehicle_detection_rain")

    with experiment.generation(
        generator="blender",
        generator_version="4.2",
        parameters={"weather": "rain", "occlusion": 0.3, "camera_distance": 12},
        seed=42,
    ) as generation:
        run_my_blender_pipeline()             # your code, unchanged

        dataset = generation.dataset(
            name="rain_dataset_v1",
            uri="s3://lab-bucket/rain_dataset_v1",
            format="image",
        )

    training = experiment.training(
        model="yolo",
        framework="pytorch",
        dataset=dataset,
        config={"epochs": 50, "batch_size": 32, "learning_rate": 0.001},
    )

    training.evaluation(metrics={"mAP": 0.724, "precision": 0.78, "recall": 0.69})
```

### Generation lifecycle

`pending → running → completed | failed`. The backend is authoritative.

The `with` block above does exactly this, and nothing more:

* on entry, `start()` if the generation is still `pending`
* on a clean exit, `complete()`
* on an exception, `fail()` and re-raise — your exception is never swallowed
* an already-terminal generation is left alone

If those semantics don't fit, skip the `with` and call `start()`, `complete()`
and `fail()` yourself:

```python
generation = experiment.generation(generator="blender", parameters={...})
generation.start()
...                                            # hours of rendering
generation.complete()
```

Failed generations stay in the record. A failed experiment is still a result.

### Training runs: metrics and resource capture

`TrainingHandle` tracks more than the run itself — step metrics and, if you
want it, a background sample of CPU/memory/GPU usage:

```python
with experiment.training(model="yolo", framework="pytorch", config={...}) as training:
    training.monitor_resources(interval_seconds=10.0)   # background sampling

    for step, loss in enumerate(train_loop()):
        training.log_metric(step=step, metrics={"loss": loss})

    training.evaluation(metrics={"mAP": 0.724}, dataset_version_id=dataset.id)
# leaving the `with` block tears every attached monitor/writer down together
```

Every attachment made through `monitor_resources()` or a framework
integration's writer/callback is registered on the same `TrainingHandle` and
closed together, either explicitly via `training.close()` or on exit from the
`with` block. On close, the SDK reports how completely resource usage was
captured (`capture_status`: `complete`, `partial`, or `unknown`) so
`synthgraph training-runs list --capture-status partial` can find runs with
incomplete telemetry later — it warns rather than raises if that report fails.

### Framework integrations

`synthgraph.integrations` turns objects you already have — an agent, a model,
a config dict — into the `parameters=`/`config=` dictionaries the SDK expects,
and in two cases (stable-baselines3, skrl) into a callback/writer that logs
metrics automatically. Nothing here is imported by core `synthgraph`, nothing
is monkey-patched, and nothing runs unless you call it:

```python
from stable_baselines3 import PPO
from synthgraph.integrations.stable_baselines3 import create_callback, extract_training_config

model = PPO("MlpPolicy", "CartPole-v1", learning_rate=3e-4)
training = experiment.training(
    model=type(model).__name__,
    framework="stable-baselines3",
    config=extract_training_config(model),
)
model.learn(total_timesteps=100_000, callback=create_callback(training))
```

| Module | What it extracts | Auto-logs metrics? |
|---|---|---|
| `integrations.stable_baselines3` | algorithm/policy/device/hyperparameters | yes — `create_callback()` |
| `integrations.skrl` | algorithm/device/spaces/hyperparameters | yes — `create_writer()` |
| `integrations.rl_games` | algorithm/model/network/hyperparameters | no |
| `integrations.isaaclab` | domain-randomization event-term config | no |
| `integrations.mujoco_playground` | env config, domain-randomize source | no |
| `integrations.wandb` | an existing `wandb.Run`'s config and summary | no |

Import the module you need directly (`from synthgraph.integrations.wandb import
extract_run_config`) — importing one never requires the others, and importing
none of them costs nothing at startup.

### Resource API

The fluent handles are a convenience over plain resource methods, which are
always available:

```python
sg.projects.create(name=..., description=..., metadata=...)
sg.projects.list()
sg.projects.get(project_id)

sg.experiments.create(project_id=..., name=...)
sg.experiments.list(project_id=..., search="rain")
sg.experiments.get(experiment_id)

sg.generations.create(experiment_id=..., name=..., generator=..., parameters=...)
sg.generations.list(experiment_id=..., parameters={"weather": "rain"})
sg.generations.get(generation_id)
sg.generations.start(id) / .complete(id) / .fail(id)

sg.datasets.create(generation_id=..., name=..., uri=...)
sg.assets.create(generation_id=..., name=..., uri=..., type=...)

sg.training_runs.create(experiment_id=..., model=..., framework=...)
sg.training_runs.add_dataset(training_run_id, dataset_version_id)
sg.training_runs.log_metric(training_run_id, step=..., metrics={...})
sg.training_runs.metrics(training_run_id)

sg.evaluations.create(training_run_id=..., metrics={...})

sg.reproduction.get(generation_id)     # reproduction manifest
sg.documentation.get(generation_id)    # generated Markdown
sg.comparisons.compare([id_a, id_b])   # backend-computed comparison
sg.auth.me()
```

Searching and parameter filtering happen on the backend; the SDK does not
filter locally.

### Code and environment provenance

Opt in explicitly — nothing is collected automatically:

```python
from synthgraph import environment_metadata, git_metadata, resource_metadata

experiment.generation(
    generator="blender",
    parameters={...},
    code_version=git_metadata().get("commit"),
    environment=environment_metadata(include_packages=["torch", "numpy"]),
)

resource_metadata()   # a point-in-time CPU/memory/GPU snapshot, ~100ms, never automatic
```

`git_metadata()` returns commit, branch, remote and dirty-tree state, with any
credentials stripped from the remote URL. It returns `{}` outside a Git
repository rather than raising. `environment_metadata()` collects a small fixed
set of runtime facts, plus versions of packages you name. `resource_metadata()`
and `installed_packages_metadata()` are both opt-in only — the latter reports
your full dependency inventory and is never called for you. None of these read
repository contents, enumerate your environment, or touch environment
variables beyond what's named above.

### Errors

```
SynthGraphError
├── SynthGraphConfigurationError
├── SynthGraphValidationError          400, 422, and client-side validation
├── SynthGraphTransportError           timeouts, connection failures, bad shapes
└── SynthGraphHTTPError
    ├── SynthGraphAuthenticationError  401
    ├── SynthGraphAuthorizationError   403
    ├── SynthGraphNotFoundError        404
    ├── SynthGraphConflictError        409
    ├── SynthGraphRateLimitError       429
    └── SynthGraphServerError          5xx
```

### Retries

Only `GET` is retried, on connection failures, timeouts and 408/429/5xx, with
exponential backoff. Writes are **never** retried automatically: the backend
exposes no idempotency key yet, and a blind retry of a `POST` could duplicate
provenance. A write that fails in transit raises `SynthGraphTransportError`
with `outcome_unknown=True` — the SDK will not tell you a record was saved
unless the backend said so.

## Query and export (CLI)

```
synthgraph
├── auth whoami
├── projects       list | get
├── experiments    list | get | search
├── generations    list | get
├── training-runs  list | get | metrics
├── evaluations    list | get
├── assets         list | get | versions | get-version
├── datasets       list | get | versions | get-version
├── compare
├── manifest
└── docs
```

```bash
synthgraph auth whoami

synthgraph projects list
synthgraph experiments list --project <project-id>
synthgraph experiments search --project <project-id> "rain"

synthgraph generations list --experiment <experiment-id>
synthgraph generations list --experiment <experiment-id> \
    --parameters '{"weather":"rain","occlusion":0.3}'
synthgraph generations get <generation-id>

synthgraph training-runs list --experiment <experiment-id>
synthgraph training-runs list --experiment <experiment-id> --capture-status partial
synthgraph training-runs get <training-run-id>
synthgraph training-runs metrics <training-run-id>

synthgraph evaluations list --training-run <training-run-id>
synthgraph evaluations get <evaluation-id>

synthgraph assets list
synthgraph assets get <asset-id>
synthgraph assets versions <asset-id>

synthgraph datasets list
synthgraph datasets get <dataset-id>
synthgraph datasets versions <dataset-id>

synthgraph compare <generation-id-a> <generation-id-b>

synthgraph manifest <generation-id> --output reproduction.json
synthgraph docs <generation-id> --output experiment.md
```

Every command takes `--json` for scripting. `--help` works at every level.

### You don't have to already know the ID

Every lookup argument above (`--project`, `--experiment`, `--training-run`,
a bare `<id>`) is optional in an interactive terminal. Leave it out and the
CLI:

1. reuses the last ID of that kind you used on this machine, if there is
   one (remembered in `~/.synthgraph/cli-state.json` - nothing here ever
   affects what gets written to the backend, only which lookup runs by
   default), or
2. lists your actual resources and asks you to pick one, drilling into
   whatever parent scope it needs first - asking for a training run with
   no experiment yet picks a project, then an experiment, then lists its
   training runs

```bash
$ synthgraph training-runs get
No ID given. Pick one:
  1. yolo_v3_baseline (a1b2c3d4-...)  (last used)
  2. yolo_v3_augmented (e5f6a7b8-...)
Enter a number (1-2) [1]:
```

None of this ever triggers in a script or a pipeline: it only engages when
stdin is a real terminal, so a script that omits a required ID still gets
the same immediate, scriptable usage error it always did. Mistyped command
names also get a suggestion (`No such command 'trainig-runs'. Did you mean
'training-runs'?`), and `synthgraph --install-completion` sets up shell tab
completion for command and option names (not resource IDs).

The CLI is a query and export surface. Creating projects, experiments,
generations, training runs, evaluations, assets and datasets belongs to the
SDK, so there is only one write API to learn and maintain.

There is no `synthgraph reproduce`. A manifest records what would be needed to
reconstruct an experiment; running your tools stays your decision, in your
environment. Note that a manifest with missing external dependencies is still a
valid provenance record — it just cannot promise reproducibility, and it says so.

The CLI has no `--api-key` option on purpose: it would put your key into shell
history and process listings. Use `SYNTHGRAPH_API_KEY`.

### Exit codes

| Code | Meaning |
|---|---|
| 0 | success |
| 1 | general failure (including a failed export) |
| 2 | invalid usage or configuration |
| 3 | authentication failed |
| 4 | not authorized |
| 5 | not found |
| 6 | validation or conflict |
| 7 | transport or backend failure |

## Development

```bash
pip install -e ".[dev]"
pytest                       # unit + CLI tests, no network
ruff check src tests
mypy
```

Integration tests run against a real backend and are skipped by default:

```bash
export SYNTHGRAPH_INTEGRATION_TESTS=1
export SYNTHGRAPH_API_KEY="..."
export SYNTHGRAPH_API_URL="http://localhost:3000"
pytest -m integration
```

## Contract status

This package is pre-1.0. Several wire-contract items are still open, and some
routes have not been verified against the backend implementation. See
[CONTRACT.md](CONTRACT.md) before depending on them.
