# SynthGraph SDK/CLI Contract

Status of the wire contract between this client and the SynthGraph backend.

**Package version:** 0.2.0 — not 1.0. Sections 3 and 4 must be closed before a
1.0 release.

This file exists because the handoff specification (§66) requires one
deliberate, documented contract decision per divergence, rather than
compatibility hacks spread across the resource modules.

---

## 1. Verified operations

These routes come from the backend API inventory (spec §62). Every one is
covered by unit tests over the real HTTP layer and by the end-to-end workflow
test.

| Operation | SDK method | CLI | HTTP | Route |
|---|---|---|---|---|
| Identity | `sg.auth.me()` | `auth whoami` | GET | `/auth/me` |
| Create project | `sg.projects.create()` | — | POST | `/projects` |
| List projects | `sg.projects.list()` | `projects list` | GET | `/projects` |
| Get project | `sg.projects.get(id)` | `projects get` | GET | `/projects/{projectId}` |
| Create experiment | `sg.experiments.create()` | — | POST | `/projects/{projectId}/experiments` |
| List/search experiments | `sg.experiments.list(search=)` | `experiments list/search` | GET | `/projects/{projectId}/experiments?search=` |
| Get experiment | `sg.experiments.get(id)` | `experiments get` | GET | `/experiments/{experimentId}` |
| Create generation | `sg.generations.create()` | — | POST | `/experiments/{experimentId}/generations` |
| List/filter generations | `sg.generations.list(parameters=)` | `generations list` | GET | `/experiments/{experimentId}/generations?parameters=` |
| Get generation | `sg.generations.get(id)` | `generations get` | GET | `/generations/{generationId}` |
| Lifecycle | `.start()` `.complete()` `.fail()` | — | PATCH | `/generations/{generationId}` |
| Create dataset (step 1 of `sg.datasets.create()`, skipped when `dataset_id=` reuses an existing one) | — | — | POST | `/datasets` |
| Create dataset version (step 2 of `sg.datasets.create()`) | — | — | POST | `/datasets/{datasetId}/versions` |
| Record dataset (step 3 of `sg.datasets.create()`: attach the version to the generation) | `sg.datasets.create()` | — | POST | `/generations/{generationId}/datasets` |
| Get dataset | `sg.datasets.get(id)` | — | GET | `/datasets/{datasetId}` |
| List datasets | `sg.datasets.list()` | — | GET | `/datasets` |
| Get dataset version | `sg.datasets.get_version(id)` | — | GET | `/dataset-versions/{datasetVersionId}` |
| List dataset versions | `sg.datasets.list_versions(id)` | — | GET | `/datasets/{datasetId}/versions` |
| Reproduction manifest | `sg.reproduction.get(id)` | `manifest` | GET | `/generations/{generationId}/reproduction-manifest` |
| Documentation | `sg.documentation.get(id)` | `docs` | GET | `/generations/{generationId}/documentation` |
| Compare | `sg.comparisons.compare([...])` | `compare` | POST | `/generations/compare` |
| Create training run | `sg.training_runs.create()` / `experiment.training()` | — | POST | `/experiments/{experimentId}/training-runs` |
| List/filter training runs | `sg.training_runs.list(capture_status=)` / `experiment.training_runs(capture_status=)` | `training-runs list` | GET | `/experiments/{experimentId}/training-runs?captureStatus=` |
| Get training run | `sg.training_runs.get(id)` | `training-runs get` | GET | `/training-runs/{trainingRunId}` |
| Training run lifecycle | `.start()` `.complete()` `.fail()` | — | PATCH | `/training-runs/{trainingRunId}` |
| Report training run capture status | `sg.training_runs.update_capture_status()` | — | PATCH | `/training-runs/{trainingRunId}/capture-status` |
| Attach dataset to training run | `sg.training_runs.add_dataset()` | — | POST | `/training-runs/{trainingRunId}/datasets` |
| Create evaluation | `sg.evaluations.create()` / `training.evaluation()` | — | POST | `/training-runs/{trainingRunId}/evaluations` |
| Get evaluation | `sg.evaluations.get(id)` | `evaluations get` | GET | `/evaluation-results/{evaluationResultId}` |
| List evaluations | `sg.evaluations.list()` / `training.evaluations()` | `evaluations list` | GET | `/training-runs/{trainingRunId}/evaluations` |
| Log training metric | `sg.training_runs.log_metric()` / `training.log_metric()` | — | POST | `/training-runs/{trainingRunId}/metrics` |
| List training metrics | `sg.training_runs.metrics()` / `training.metrics()` | `training-runs metrics` | GET | `/training-runs/{trainingRunId}/metrics` |
| Create asset (step 1 of `sg.assets.create()`, skipped when `asset_id=` reuses an existing one) | — | — | POST | `/assets` |
| Create asset version (step 2 of `sg.assets.create()`) | — | — | POST | `/assets/{assetId}/versions` |
| Record asset (step 3 of `sg.assets.create()`: attach the version to the generation) | `sg.assets.create()` / `generation.asset()` | — | POST | `/generations/{generationId}/assets` |
| Get asset | `sg.assets.get(id)` | — | GET | `/assets/{assetId}` |
| List assets | `sg.assets.list()` | — | GET | `/assets` |
| Get asset version | `sg.assets.get_version(id)` | — | GET | `/asset-versions/{assetVersionId}` |
| List asset versions | `sg.assets.list_versions(id)` | — | GET | `/assets/{assetId}/versions` |

Error mapping is deterministic for all of them:

| Status | Exception | CLI exit code |
|---|---|---|
| 400, 422 | `SynthGraphValidationError` | 6 |
| 401 | `SynthGraphAuthenticationError` | 3 |
| 403 | `SynthGraphAuthorizationError` | 4 |
| 404 | `SynthGraphNotFoundError` | 5 |
| 409 | `SynthGraphConflictError` | 6 |
| 429 | `SynthGraphRateLimitError` | 7 |
| 5xx | `SynthGraphServerError` | 7 |
| network/timeout/bad shape | `SynthGraphTransportError` | 7 |

---

## 2. Decisions made and why

These were open in the source material. Each is now settled in exactly one
place in the code.

### 2.1 Seed lives in `reproducibility`, not on the generation

The illustrative canonical payload in spec §67 shows `seed` beside
`parameters`. The Generation field list in §19 does not list `seed` as its own
field, and the implemented v0.1.0 `Reproducibility` model carries it.

**Decision:** the wire carries `reproducibility.seed`. `seed=` on
`generations.create()` is shorthand for it, and `GenerationRun.seed` reads it
back. Passing both `seed=` and a `reproducibility` that already has a different
seed is rejected rather than silently resolved.

### 2.2 `generator` is a nested object

v0.1.0 already sends `{"name":..., "version":..., "type":...}`. Kept.
`generator="blender", generator_version="4.2"` is accepted as shorthand and is
lifted into the same object.

### 2.3 The SDK sends snake_case and reads either case

Spec §67 and the v0.1.0 models use snake_case, so that is what is sent. A
NestJS backend may serialize camelCase, and field naming is explicitly not
frozen (§36), so models accept both on read via a single alias generator in
`models/base.py`. Not a per-field hack.

### 2.4 Response envelopes are tolerated on read

§36 leaves envelopes undecided. `serialization/wire.py` accepts a bare body and
a `{"data": ...}` / `{"items": ...}` / `{"results": ...}` envelope, in one
place. When the envelope is frozen, delete the tolerance there.

### 2.5 Unknown backend fields are preserved

Models use `extra="allow"`, so a field the backend adds is visible to
researchers without an SDK release (§7.7).

### 2.6 Manifests and comparisons export verbatim

`ReproductionManifest.to_dict()` and `ComparisonResult.to_dict()` return the
backend's payload exactly, not a re-serialization of the SDK's view of it. An
export must not silently drop a field the SDK does not model, and the CLI must
not change the scientific meaning of a comparison (§49, §50).

### 2.7 Writes are never retried

Only GET/HEAD/OPTIONS are retried (transport failures, 408/429/5xx, exponential
backoff). The backend exposes no idempotency-key contract, so an automatic POST
retry could duplicate provenance (§33). A write that fails in transit raises
`SynthGraphTransportError(outcome_unknown=True)`; the SDK never reports success
without backend confirmation (§7.5).

### 2.8 Documented context-manager semantics

`with experiment.generation(...)` starts a pending generation on entry,
completes it on clean exit, and fails-and-re-raises on exception. A generation
already in a terminal state is left alone, and a failure of the lifecycle call
itself never masks the researcher's own exception. §35 permits this only if the
behaviour is written down; it is, here and in the README and the docstring.

### 2.9 Environment and Git capture are on by default for generations and training runs

Superseded: this used to say capture was opt-in for everything (§31, §32).
`git_metadata()` and `environment_metadata()` themselves are still only ever
called explicitly by the SDK's own code, never by reaching into a researcher's
process behind their back - but `generations.create()` and
`training_runs.create()` now call `environment.auto_capture()` (the two
composed) by default whenever the caller hasn't already supplied an
`environment` (generations) or a `metadata["environment"]` (training runs,
which has no dedicated reproducibility field). `capture_environment=False`
turns it off per call. `git_metadata()` still strips credentials from remote
URLs and returns `{}` outside a repository; `environment_metadata()` still
collects only five fixed fields plus versions of packages the caller names -
the *what* is unchanged, only the *automatic-by-default* part is new.

### 2.10 The CLI takes no `--api-key`

Credentials come from `SYNTHGRAPH_API_KEY` only. A command-line option would
land the key in shell history and process listings (§57).

### 2.11 The CLI does not write

No `projects create`, no `generations create`, no `reproduce`. Capture belongs
to the SDK, and running research tooling belongs to the researcher (§58, §59).

### 2.12 `SYNTHGRAPH_API_URL` is the configuration name

It matches the existing `SynthGraphConfig.api_url` field. `SYNTHGRAPH_BASE_URL`
is accepted as an alias because the spec text uses that spelling.

### 2.13 `sg.datasets.create()` is a three-request flow

The backend models a dataset as a logical `Dataset` (identity: `name`,
`description`, `metadata`) with immutable `DatasetVersion` records hanging off
it, plus a separate attachment record linking a version to a generation. The
SDK's one-call ergonomic `datasets.create()` covers all three steps:

1. `POST /datasets` to create a new `Dataset` named after the `name=`
   argument - skipped when the caller passes `dataset_id=` to reuse an
   existing logical dataset instead.
2. `POST /datasets/{datasetId}/versions` to create the immutable version.
   When `version=` is omitted, the SDK defaults it to the current UTC
   timestamp in ISO-8601 (`_default_version()` in `datasets.py`): always
   unique, and cheaper than an extra round trip to check for collisions.
3. `POST /generations/{generationId}/datasets` to attach the new version to
   the generation. When `role=` is omitted, the SDK defaults it to
   `"output"` - a dataset a generation records is normally something it
   produced.

### 2.14 Training run payload maps ergonomic names onto `trainer`/`parameters`

`training_runs.create()` keeps its existing Python-facing keywords - `model=`,
`framework=`, `framework_version=`, `config=` - but the backend's DTO has no
matching flat fields. The SDK maps them on the wire: `model` -> `trainer.name`,
`framework` -> `trainer.type`, `framework_version` -> `trainer.version`,
`config` -> `parameters`. `parameters` is always sent (defaulting to `{}`),
matching how `generations.create()` already always sends `parameters`.

The backend also does not accept `datasets` or `status` on create - every
training run starts `pending`. Passing `status=` to `training_runs.create()`
raises `SynthGraphValidationError` instead of being silently dropped.
`datasets=` is instead attached with one `POST
/training-runs/{trainingRunId}/datasets` call per dataset, after the training
run itself is created; the object `create()` returns is then re-fetched with
`GET /training-runs/{trainingRunId}` so it reflects the attached datasets
rather than the empty list the create response carries.

### 2.15 Evaluation `dataset_version_id` is required, not optional

The backend's evaluation-result DTO validates `dataset_version_id` with
`@IsUUID()` and no `@IsOptional()`. `evaluations.create()` now requires it
too, rather than silently posting an evaluation with no comparable dataset
version behind it.

### 2.16 `sg.datasets.create()` returns the `DatasetVersion`, not the attachment record

`POST /generations/{generationId}/datasets` returns the attachment record
(what links a dataset version to a generation), not the `DatasetVersion`
itself. `datasets.create()` returns the `DatasetVersion` produced by step 2 of
its flow (2.13) and only fires the attach request for its side effect,
because that is what `generation.dataset(...)` has always handed back to
callers.

### 2.17 Training-run metrics are a new capability, not a reconciliation

`TrainingRunMetric` (`POST`/`GET /training-runs/{trainingRunId}/metrics`) has
no prior SDK surface and no earlier backend precedent to reconcile against -
unlike the routes above, which corrected assumptions against an existing
backend controller (section 3), this is new on both sides at once. **New**,
not reconciled.

Two decisions made while adding it:

* **No uniqueness constraint on `(training_run_id, step)`.** Multiple metric
  points may be logged at the same step - e.g. one row for train-loss and
  another for eval-reward recorded together at step 100 - so
  `log_metric()` never checks for or rejects a duplicate step.
* **Lives on `TrainingRunsAPI`/`TrainingHandle`, not its own top-level
  resource.** A metric point only ever makes sense in the context of the
  training run it was recorded against (same relationship `evaluations` has
  to `training_runs`), so it is `sg.training_runs.log_metric()` /
  `training.log_metric()`, not a new `sg.training_run_metrics` client
  attribute.

### 2.18 `sg.assets.create()` mirrors the dataset three-request flow, with `type` on the `Asset` and no `format` anywhere

The backend now implements `Asset`/`AssetVersion`/`GenerationAssetReference`
(mirroring `Dataset`/`DatasetVersion`/`GenerationDatasetReference` almost
exactly), so the previously-unverified `POST /generations/{id}/assets` route
is verified and moved to section 1; `UNVERIFIED_ROUTES` is now empty.
`assets.create()` follows the identical three-step shape as `datasets.create()`
(2.13):

1. `POST /assets` to create a new `Asset` named after `name=` - skipped when
   `asset_id=` reuses an existing logical asset.
2. `POST /assets/{assetId}/versions` to create the immutable `AssetVersion`.
   `version=` defaults to a UTC timestamp the same way `datasets.create()`
   does.
3. `POST /generations/{generationId}/assets` to attach the version to the
   generation, with `role=` defaulting to `"output"`.

Two field-shape differences from `Dataset`/`DatasetVersion`, both driven
directly by the SDK's existing Pydantic models
(`synthgraph/models/asset.py`), which were never changed to invent new
fields:

* **`type` lives on `Asset`, not `AssetVersion`.** `Asset.type` is a
  free-form string (e.g. `"video"`, `"plot"`, `"checkpoint"`) the backend
  never validates the meaning of - the same pattern as `Generator.type`.
  `Dataset` has no equivalent field. `assets.create()`'s `type=` keyword goes
  into the step-1 payload (`POST /assets`), not step 2.
* **`AssetVersion` has no `format` field**, unlike `DatasetVersion`.
  `assets.create()` has no `format=` parameter, and the step-2 payload
  (`POST /assets/{assetId}/versions`) never sends one.

The attach payload for both the asset and dataset routes carries the backend
DTO's actual field name, `{assetVersionId, role}` / `{datasetVersionId,
role}` (camelCase, matching `CreateGenerationAssetReferenceDto` /
`CreateGenerationDatasetReferenceDto` in the backend source) - `assets.py`
sends `assetVersionId` deliberately. At the time this was written,
`datasets.py` sent snake_case `dataset_version_id` for the same kind of
payload - §2.3's "the SDK sends snake_case" rule applied too literally to
this one field - but that has since been fixed (§2.21) to also send the
backend's real camelCase field name.

---

## 3. UNVERIFIED — routes that need checking against the backend

Spec §63 explicitly refuses to freeze a route until the backend controller
behind it has been inspected. Training-run, dataset, evaluation-result and
asset-reference routes have now been read from the backend source and
corrected (section 1); nothing is left unverified.

Two smaller unknowns in a related category:

* **Comparison response shape.** `POST /generations/compare` is a verified
  route, but the shape of what it returns is not. The CLI renders a
  `differences` mapping or list when it recognizes one and otherwise prints the
  payload — it never claims two generations are identical because it did not
  recognize the structure.
* **Documentation content type.** Markdown may arrive as `text/markdown` or
  wrapped in a JSON field. Both are handled in `http.get_text()`.

---

## 4. Still open before v1.0

Per spec §36, §67 and §68, these must be frozen and this file updated:

- [ ] exact wire field names (and whether the backend emits snake_case or camelCase)
- [ ] required vs optional fields per payload
- [ ] identifier format (UUID assumed but not enforced beyond "usable path segment")
- [ ] timestamp format and timezone guarantees
- [ ] response envelope, if any
- [ ] error body shape
- [ ] API versioning scheme
- [ ] idempotency keys for writes — until then, writes are not retried
- [ ] comparison response schema
- [ ] credential storage for the CLI beyond environment variables
- [ ] pagination for list endpoints (none is implemented, because none is documented)

Deliberately **not** implemented, per the spec:

- offline SQLite cache/sync (legacy design, §1 and §56)
- tool integrations — Blender, Unity, W&B (v1.1, §10)
- CLI write commands (§58)
- `synthgraph reproduce` (§59)
- dataset or asset upload (§6)

### 2.19 The Isaac Lab integration is source-verified, not live-verified

`synthgraph.integrations.isaaclab.extract_event_config()` (added after §10's
"automatic instrumentation, hooks, decorators" was written) turns an Isaac
Lab `EventManager`/`EventCfg`'s domain-randomization terms into a plain dict
for `generation.create(parameters=...)`. It is a plain function the caller
imports and calls explicitly - nothing under `synthgraph.integrations` is
imported by the core package, and nothing monkey-patches or wraps Isaac Lab.
`isaaclab` is not on PyPI (it ships alongside Isaac Sim, a large
GPU-simulation stack), so it cannot be pip-installed here and this has not
been exercised against a live installation - but it has been checked
directly against the real source on GitHub
(`isaac-sim/IsaacLab`, `managers/manager_term_cfg.py` and `manager_base.py`),
not just documentation: `EventTermCfg`'s `func`/`mode`/`interval_range_s`/
inherited `params` are exactly as assumed, `ManagerBase.__init__` really
does store `self.cfg`, and `ManagerBase` itself falls back to
`cfg.__dict__.items()` to walk a non-dict cfg - the same approach this
module's `_public_attributes()` uses. What remains genuinely unverified is
only the live values a running environment produces, not the attribute
shape. Treat this as "verified against the pinned source, not against a
live run" rather than "unverified."

### 2.20 `resource_metadata()` is opt-in, not part of `auto_capture()`

Unlike `git_metadata()`/`environment_metadata()`, a CPU/memory/GPU snapshot
has real cost (a blocking ~100ms `psutil` sample, a subprocess spawn for
`nvidia-smi`) and is meaningful at a specific moment in a training loop, not
once at generation/training-run creation - so `resource_metadata()` stays a
function the caller calls explicitly (e.g. into `metadata=`), never wired
into `auto_capture()`. `cpu_count` and GPU stats need no dependency
(`nvidia-smi`, when present, is queried the same subprocess-based way
`git_metadata()` queries `git`); CPU percent and memory come from the
optional `psutil` extra (`pip install synthgraph-sdk[resource]`) and are
simply absent without it - verified end-to-end against real hardware
(`psutil`'s CPU/memory sampling and a real `nvidia-smi` GPU query) in this
environment, not just mocked, before the mocked tests were written.

### 2.21 Reference-attach and comparison payloads use the backend's real camelCase field names

Found while reviewing the media/asset-reference feature (its attach-reference
DTO correctly used camelCase from the start, which is what surfaced the
mismatch elsewhere): `sg.datasets.create()`'s
attach step, `sg.training_runs.add_dataset()`, `sg.evaluations.create()`, and
`sg.comparisons.compare()`/`client.compare()` were all sending snake_case keys
(`dataset_version_id`, `generation_ids`) into request bodies whose backend DTOs
declare plain camelCase TypeScript properties (`datasetVersionId`,
`generationIds`) with no naming-strategy transform anywhere in the backend -
confirmed by reading `main.ts`'s `ValidationPipe({ whitelist: true,
forbidNonWhitelisted: true })` and every relevant DTO directly, not assumed.
Under `forbidNonWhitelisted`, a snake_case body key the DTO doesn't recognize
makes the whole request 400. This is unrelated to §2.3 ("the SDK sends
snake_case and reads either case"), which is about the SDK's own response
*parsing* tolerance (`models/base.py`'s alias generator) - it was never a
license for request bodies to diverge from the backend's literal DTO field
names. The `comparisons.compare()` instance of this predates every other fix
in this file; the three others were introduced or made unconditionally
reachable by §2.13/§2.14/§2.15. All four are now fixed to send the DTOs'
actual field names. The SDK's own Python-facing parameter names
(`dataset_version_id=`, `generation_ids`) are unchanged - only the JSON keys
sent over the wire moved to camelCase for these four calls specifically; every
other endpoint's payload fields (`name`, `metrics`, `parameters`, `role`,
`step`, ...) are single words with no casing ambiguity, checked directly
against every DTO in the backend rather than assumed to be fine.

### 2.22 Three more framework integrations, each verified at a different, honestly-stated tier

`synthgraph.integrations` gained `skrl`, `rl_games`, `mujoco_playground` and
`wandb` alongside the existing `isaaclab`/`stable_baselines3` ones. Each
follows the same contract (a plain function the caller invokes explicitly
with an object they already have; no import of the target framework at
module load time; nothing runs automatically) - what differs is how each
was verified, stated plainly rather than uniformly claiming "verified":

* **`skrl.extract_training_config()`** - live-verified. `pip install skrl`
  (its `torch` dependency was already present) let a real `PPO` agent be
  fully constructed (real `Model`/`GaussianMixin`/`DeterministicMixin`
  subclasses, a real `PPO_CFG`) and run through the extraction function -
  this surfaced a real behavior no amount of reading source would have
  shown: skrl's `cfg.expand()` turns scalar hyperparameters like
  `learning_rate` into a per-model *list*, not a bare float. The extraction
  reads `agent.cfg` generically (whatever fields are actually on it, minus
  `experiment`), so it works the same way across every skrl algorithm, not
  just the one tested.
* **`rl_games.extract_training_config()`** - live-verified against real
  data, not a live agent. rl_games agents need a heavyweight YAML/network-
  builder harness this SDK won't stand up just to construct a throwaway
  agent, so instead this was checked against `Denys88/rl_games`'s real
  source (`self.config = params['config']` in `A2CBase.__init__`) and a
  real shipped example config (`rl_games/configs/ppo_continuous.yaml`,
  fetched and parsed) - including the unwrap `Runner.load()` itself does on
  a raw `yaml.safe_load()` result's `"params"` key, and a real quirk this
  surfaced: PyYAML parses unquoted `3e-4` as the *string* `"3e-4"`, not a
  float, which the extraction function correctly passes through rather than
  silently coercing.
* **`mujoco_playground.extract_env_config()` /
  `extract_domain_randomize_fn()`** - live-verified against a real
  installed package (`pip install playground`), but split into two
  functions because Playground's architecture is genuinely different from
  Isaac Lab's: domain randomization is imperative code (a per-task
  `domain_randomize(model, rng)` function with literal `jax.random.uniform`
  ranges baked into its body, confirmed by reading four real `randomize.py`
  files on GitHub), not a declarative config object with inspectable
  attributes. `extract_env_config()` reads the real, structured
  `ConfigDict` every task's `default_config()` returns (confirmed against
  the real Go1 joystick task). `extract_domain_randomize_fn()` records the
  randomization function's qualified name always, and its literal source
  text via `inspect.getsource()` when available (confirmed working against
  the real Go1 `randomize.py`) - the only way to see the actual numeric
  ranges given this architecture, degrading to just the name rather than
  raising when source isn't retrievable.
* **`wandb.extract_run_config()` / `extract_run_metrics()`** - live-verified
  (`pip install wandb`, `wandb.init(mode="offline", ...)` - no account or
  network needed) against a real running `Run`. Deliberately the mirror-in
  pattern, not the monkey-patch-`wandb.init()`/`wandb.log()` pattern
  originally floated as an alternative strategy: intercepting calls in the
  researcher's process without an explicit invocation at that point
  contradicts every other integration in this package. `extract_run_metrics
  ()` drops wandb's own bookkeeping keys (`_runtime`, `_step`,
  `_timestamp`, confirmed present on a real run's `.summary`) rather than
  passing them through as if the researcher had logged them.

`isaaclab.extract_event_config()` (§2.19) remains the one exception without
live verification, because `isaaclab` itself isn't pip-installable and its
runtime dependency is a GPU-simulation stack this environment cannot run at
all - source-verification was the strongest tier available for it.

### 2.23 Framework callbacks, not hooks or monkey-patching, are the answer to "capture still needs manual calls"

`stable_baselines3.create_callback()` is the first of what's meant to become
a small family of framework-callback integrations, answering a real
objection: `log_metric()` being a manual call per training step is genuine
friction, and "automatic" elsewhere in this SDK (§2.9) only ever meant
"bundled into a call you already make," never "zero SynthGraph-related code
in your script." Two ways exist to actually reduce that friction:

1. **Hooks/monkey-patching** - intercept a framework's calls without an
   explicit invocation at that point. Rejected as a general strategy (§2.22's
   `wandb` entry, and the standing "nothing runs automatically" design
   throughout this SDK) - fragile across framework versions, hard to debug
   ("why did this HTTP call fire?"), and no explicit consent for what gets
   captured.
2. **The framework's own callback system** - SB3 (and skrl, PyTorch
   Lightning, Keras) each ship a documented, sanctioned extension point
   exactly for this (it's how W&B's and TensorBoard's own SB3 integrations
   work). Registering a callback is itself one explicit line of code
   (`model.learn(callback=create_callback(training))`) - after that, the
   *framework's own code* invokes the callback at each rollout, not
   SynthGraph reaching into the framework uninvited. This is the approach
   taken.

`create_callback()` lazily imports `stable_baselines3.common.callbacks.
BaseCallback` only when called - a bare `import synthgraph.integrations.
stable_baselines3` still never requires SB3, preserving the rest of this
module's zero-cost-when-unused contract; only building a callback does.

**Verified at the strongest tier used anywhere in this SDK**: a real local
backend, a real project/experiment/training run created through the real
SDK, a real `PPO` model trained on `CartPole-v1` for 320 timesteps with the
callback attached, and the resulting metric points read back from Postgres
afterward. That run caught two real things before they shipped:
`model.logger.name_to_value` is empty on the first rollout (before SB3's
first training update runs) - skipped rather than logged as a no-op point -
and its values are a mix of `numpy.float32`/`numpy.float64`, only one of
which happens to already subclass Python's `float`; both are coerced via
`_numeric_metrics()` rather than assumed to already be JSON-safe. A failure
to reach the backend for one rollout is caught and turned into a
`warnings.warn()`, not raised - losing one metric point beats aborting a
training run that might run for hours.

**Also found, unrelated to the callback itself**: `experiment.training()`
has no default-name behavior the way `experiment.generation()` does (the
latter derives one from `generator` via `_default_generation_name()`) - the
backend's `name` field is required, so a `training()` call without an
explicit `name=` fails with a validation error. Not fixed here (out of
scope for this change), flagged for a follow-up.

### 2.24 skrl's extension point is a writer object, not a callback list - `create_writer()`, not `create_callback()`

The second framework-callback integration, following §2.23's reasoning, but
skrl's own sanctioned extension point turned out to be structurally
different from SB3's once actually checked against real source rather than
assumed to match: every skrl agent owns `self.writer` (normally a
TensorBoard `SummaryWriter`) and calls `self.writer.add_scalar(tag=, value=,
timestep=)` once per tracked metric - not once per batch - whenever
`agent.post_interaction()` crosses a `cfg.experiment.write_interval`
boundary. Confirmed directly by driving the real
`agent.track_data()`/`agent.post_interaction()` machinery with a spy in
place of `agent.writer`: three `track_data()` calls followed by one
`post_interaction()` crossing the boundary produced exactly three
`add_scalar()` calls, all sharing one `timestep`.

`skrl.create_writer(training, wrapped=agent.writer)` returns a drop-in
writer that batches same-timestep `add_scalar()` calls into a single
`training.log_metric()` call instead of one HTTP request per tag, and
forwards every call to `wrapped` first so existing TensorBoard logging keeps
working unchanged - SynthGraph logging is additive, not a replacement.
Unlike `stable_baselines3.create_callback()`, this needs no lazy import of
skrl at all: the writer is pure duck-typing (`add_scalar`/`flush`/`close`),
so `create_writer()` itself has zero skrl dependency - only actually
assigning its result to a real agent's `.writer` does.

**A real gotcha this surfaced, not present in the SB3 callback**: batching
by timestep means the final write_interval's worth of metrics only reaches
SynthGraph once a later call arrives with a different timestep, or the
writer is explicitly flushed. skrl's own `SequentialTrainer` never calls
`.close()`/`.flush()` on the writer itself (confirmed by reading its
`train()` method), so the last batch of a training run would be silently
lost without an explicit `agent.writer.close()` after training - documented
prominently on `create_writer()`, not left as a footnote, since it is easy
to get this wrong and lose exactly the metrics from the end of a run.

**Also found in passing**: skrl already has built-in Weights & Biases
support (`cfg.experiment.wandb = True` makes skrl call `wandb.init()` and
sync its own TensorBoard writer via `sync_tensorboard=True`) - meaning
`wandb.extract_run_metrics()` (§2.22) is already a viable, zero-new-code
path from skrl into SynthGraph today for anyone willing to add the `wandb`
dependency, as an alternative to `create_writer()`.

Verified the same way as `create_writer()`: a real spy in place of a real
agent's `.writer`, confirming batching-by-timestep, `.close()`-flushes-the-
final-batch, wrapped-writer-forwarding-continues-even-on-SynthGraph-failure,
and a caught backend failure turning into a `warnings.warn()` rather than
propagating - not fakes standing in for skrl's actual call pattern.

### 2.25 Background resource sampling (`ResourceMonitor`), modeled on MLflow's real implementation, not W&B's

The third and final piece of the "reduce friction without hooks" work (after
§2.23, §2.24): `environment.ResourceMonitor` / `training.monitor_resources()`
runs `resource_metadata()` on a background thread at a fixed interval,
logging each sample via `log_metric()`, so continuous resource usage over a
training run doesn't need a manual call at every point a sample is wanted.

This is the one piece of the automatic-capture work that genuinely could
not be built as "register a callback the framework already invokes" (§2.23,
§2.24's reasoning) - there is no framework here at all, resource usage isn't
tied to any training library's own extension points. A background thread is
the only way to sample on a timer independent of whatever loop the
researcher's code is running. It is still opt-in, not automatic-by-default:
nothing samples anything until `.start()` (or the `with` form) is called
explicitly, the same as every other capture mechanism in this SDK.

**Researched before building, not designed from assumption**: read the real
source of both competitors that already do this.
- **Weights & Biases** runs its system monitor in a *separate compiled Go
  process* (`wandb-core`, confirmed via `core/internal/monitor/monitor.go`
  in `wandb/wandb` on GitHub - `defaultSamplingInterval = 15.0 *
  time.Second`), communicating with the Python SDK over gRPC. Appropriate
  for a project that already ships a compiled service; wrong fit for a
  pure-Python SDK with no compiled component of its own.
- **MLflow** (`mlflow/system_metrics/system_metrics_monitor.py`) is a
  genuine `threading.Thread(daemon=True)`, default `sampling_interval=10`
  seconds, using a `threading.Event().wait(interval)` for responsive
  shutdown rather than `time.sleep()`, decoupling *sample* frequency from
  *log* frequency (`samples_before_logging`, aggregated before publishing),
  and `finish()` sets the shutdown event, joins the thread, then flushes.
  This is the closer architectural analog for this SDK and what
  `ResourceMonitor` is modeled on - `interval_seconds` defaults to MLflow's
  10 seconds, not W&B's 15.

**One deliberate deviation from MLflow**: MLflow's loop polls the run's own
status and stops permanently if the run is no longer `RUNNING` or a publish
call fails ("this is expected if the experiment/run is already terminated").
`ResourceMonitor` does not adopt that - a failed sample or a failed
`log_metric()` call logs a `warnings.warn()` and the thread keeps retrying
on the next interval, never stopping itself. Tying a stop decision to
training-run status would need an extra network call every tick just to
check it; simpler and more resilient to just keep trying until `stop()` is
called explicitly, since a transient network blip during an hours-long
training run recovering on its own beats it going silent for the rest of
the run.

**A gotcha also present in MLflow's own design, solved the same way**: the
final interval's worth of data would be lost if the thread were simply
abandoned rather than explicitly stopped - `stop()` (or exiting the `with`
block) joins the thread *and* logs one more sample immediately afterward,
mirroring MLflow's `finish()` flushing before it returns.

Verified at the same tier as the SB3 callback: a real local backend, a real
project/experiment/training run created through the real SDK,
`training.monitor_resources(interval_seconds=0.5)` wrapping a simulated
2.5-second training loop, and 6 real metric points (real GPU/CPU data from
this machine, the same `resource_metadata()` already verified against real
hardware in §2.20) read back from Postgres afterward. Thread lifecycle
behavior (periodic sampling, idempotent `start()`, safe repeated `stop()`,
the final-sample guarantee, and that a failing backend call warns rather
than killing the thread) has its own dedicated unit test suite
(`test_resource_monitor.py`) using a fast interval and a fake handle, since
those semantics don't need real hardware or a real backend to verify.

v0.1.0 declared `pydantic>=2.0,<3.0` while `models/generation.py` uses
`Field(exclude_if=...)`, which requires pydantic 2.12+. On pydantic 2.0–2.11
that package would install and then fail. The floor is now `>=2.12`.

### 2.26 `IntegrationSession` - bundling cleanup for every integration attached to one training run

§2.24 and §2.25 each document the same shape of bug: `create_writer()` and
`ResourceMonitor` both hold state that only flushes on an explicit
`.close()`/`.stop()` call, and a researcher's script has no natural reminder
to make that call - it just ends. This was not a hypothetical risk: a naive
script (`training.monitor_resources(interval_seconds=1.0)`, a 5-step loop,
then the script simply ends - no `.stop()`, no `with`, no exception) was run
against a real local backend and produced exactly 5 logged samples, zero
warnings, and exit code 0. Nothing about that run signals anything is
missing; the gap (no sample capturing the run's actual final state) is
invisible unless you already know to look for it.

`IntegrationSession` (`integration_session.py`) moves the responsibility for
remembering from the researcher to the integration itself. `ResourceMonitor`
and `create_writer()` each register their own cleanup (`self.stop` /
`writer.close`) with `training._integration_session` at construction time -
duck-typed via `getattr(training, "_integration_session", None)`, so a test
fake with no session attribute at all (every existing integration test)
keeps working unchanged. `TrainingHandle` owns the session and gained
`close()` plus `__enter__`/`__exit__`: leaving a `with experiment.training(
...) as training:` block, or calling `training.close()` directly, closes
every registered integration together, once, in registration order. A
closer that raises is caught and turned into a `warnings.warn()` rather than
allowed to stop the rest from closing - the same "one integration's failure
must not lose another's data too" principle used throughout
`synthgraph.integrations`.

**Deliberately not a hooks/monkey-patching orchestrator.** This only
coordinates SynthGraph's own integration objects - it never reaches into a
third-party framework or intercepts anything there. Every integration still
only fires through the framework's own sanctioned extension point (SB3's
callback list, skrl's writer object), exactly as §2.23/§2.24 established;
`IntegrationSession` changes nothing about how or when an integration is
invoked, only what happens to it when a researcher forgets to close it.

**Explicitly out of scope for this change**: `create_callback()` (SB3) is
not registered with the session, because it has nothing to flush - it logs
synchronously on each `_on_rollout_end()` call and holds no pending state,
unlike the writer's batch-per-timestep buffering. Registering it would add a
no-op closer for no reason.

**`TrainingHandle.__exit__` does not manage training-run status.** This is a
deliberate difference from `GenerationHandle`'s context manager (which calls
`start()`/`complete()`/`fail()` on enter/exit): bundling integration cleanup
and transitioning a training run's lifecycle are different concerns, and
conflating them here would have been a second, unrelated feature smuggled
into this one. `start()`/`complete()`/`fail()` remain separate, explicit
calls.

**Verified twice against the real backend, before and after**: the naive
script above (no `with`, no `.stop()`) produced 5 samples with a plain
`TrainingHandle`. The identical script - still zero `.stop()` calls anywhere
- wrapped in `with experiment.training(...) as training:` produced 6:
sample 5 landed the moment the `with` block exited, 0.7s after the last
periodic one, matching wall-clock exactly. Unit-level behavior (registration
order, idempotent `close()`, one closer's failure not blocking another's,
the duck-typed no-session case) has its own suite
(`test_integration_session.py`), plus new cases in
`test_resource_monitor.py`, `test_integrations_skrl.py`, and `test_fluent.py`
covering each integration's registration and `TrainingHandle`'s `close()`/
context-manager behavior specifically.

### 2.27 `capture_status` - reporting `IntegrationSession`'s state to a queryable backend column

§2.26 solves data loss in-process; this closes the other half of the same
problem, "did this run's capture actually work," which until now only ever
had an answer while the process was alive and its warnings were still on
screen. Backend: `training_runs` gained a nullable `jsonb` `capture_status`
column (migration `AddCaptureStatusToTrainingRuns1788990000000`) and a new
route, `PATCH /training-runs/{id}/capture-status`
(`UpdateTrainingRunCaptureStatusService`), separate from the existing status
PATCH for the same reason `TrainingHandle.close()` doesn't touch
`start()`/`complete()`/`fail()` (§2.26) - lifecycle status and capture
completeness are different concerns, and a state-machine-shaped endpoint
(`UpdateTrainingRunStatusService`'s `validTransitions`) is the wrong home for
an idempotent report that has no transitions to validate.

**NULL is the deliberate default, not `{}`.** A training run this SDK
version never reported on must stay distinguishable from one that reported
"nothing was attached" - collapsing the two would make "did this run predate
the feature, or genuinely use no integrations" unanswerable later from the
data alone.

**SDK side**: `IntegrationSession.close()` now records, per registered
closer, whether it raised, and `.summary()` turns that into `{"status":
"complete" | "partial", "integrations": {name: {"attached": true, "closed":
bool}}}` - `None` when nothing was ever registered, so a training run that
used no integrations at all triggers no report and no network call.
`TrainingHandle.close()` sends this to `training_runs.update_capture_status()`
after `IntegrationSession.close()` runs, and only on the call that actually
performed the close - `IntegrationSession.close()` now returns whether it did
the work (`False` on a repeat call), specifically so a second `close()` call
cannot re-send the same report. A failure to reach the backend for the report
itself is caught (`SynthGraphError`) and turned into a `warnings.warn()`,
never raised - the same "capture must never be the reason the script
crashes" principle used everywhere else in this SDK, now applied to
reporting on capture itself, not just capture.

**Verified end-to-end against the real backend and Postgres, not just
mocked**: the exact `with experiment.training(...)` / `monitor_resources()`
/ no explicit `.stop()` scenario from §2.26 was re-run through the real SDK
against the real local backend. `client.training_runs.get(training.id)`
after the block exited returned `capture_status = {"status": "complete",
"integrations": {"resource_monitor": {"attached": true, "closed": true}}}`,
confirmed independently by querying `training_runs.capture_status` directly
in Postgres - the full path (`ResourceMonitor` → `IntegrationSession.close()`
→ `.summary()` → `TrainingHandle.close()` → `update_capture_status()` → the
new backend route → the new column) works end to end, not just at the unit
level.

### 2.28 `?captureStatus=` - the audit query this whole feature was for

§2.25-2.27 built the pieces (in-process cleanup, a queryable column, the SDK
reporting into it); this is the step that turns the column into an answer a
lab can actually ask for: "which of our training runs have incomplete
capture." `GET /experiments/{id}/training-runs?captureStatus=complete|
partial|unknown` (`ListTrainingRunsQueryDto`, mirroring
`ListGenerationsQueryDto`'s existing `?parameters=` filter pattern exactly)
filters server-side rather than requiring every client to fetch every run
and filter in memory.

**`unknown` queries `capture_status IS NULL` directly** -
`TypeOrmTrainingRunRepository.findByCaptureStatus()` special-cases it rather
than treating `"unknown"` as a value that could ever actually be stored in
the column, consistent with §2.27's decision that NULL *is* the "never
reported" sentinel, not a fourth value alongside it. `complete`/`partial`
query `capture_status ->> 'status' = :captureStatus`, the same raw-JSONB
querybuilder pattern `TypeOrmGenerationRepository.findByParameters()`
already used for `generation.parameters -> :key @> :value::jsonb` - alias
tokens like `trainingRun.captureStatus` resolve through TypeORM's metadata
even inside a raw operator fragment, confirmed by that existing code, not
assumed.

Kept as a query parameter on the existing per-experiment list endpoint
rather than a new cross-experiment/whole-project endpoint - a lab-wide
"every run with a gap" view is a real future want, but experiments are the
existing natural scope boundary in this schema, and building a new
project-wide listing endpoint is a bigger, separate change this step didn't
need.

**SDK**: `training_runs.list(capture_status=)` and
`experiment.training_runs(capture_status=)` both take the filter, validated
client-side against the same three values before it ever reaches the
network (`SynthGraphValidationError` on anything else) - consistent with
every other enum-shaped parameter in this SDK.

**Verified end-to-end against the real backend and Postgres**: created three
training runs in one experiment - one untouched (stays `unknown`), one with
a cleanly-closing integration (`complete`), one with a closer that raised
(`partial`) - and confirmed each of the three `?captureStatus=` values
through the real SDK returned exactly and only its matching run's id, not
mocked. Backend suites (93 unit, 87 e2e) and the SDK suite (mypy clean, same
2 pre-existing unrelated failures) pass unchanged.

### 2.29 Two low-severity items from reviewing 2.26-2.28, fixed together

Neither blocked anything - both were flagged as informational/cosmetic
during a review pass and left for a follow-up rather than fixed inline.

**No index supported `?captureStatus=` at scale.** Every query was already
scoped by the indexed `experiment_id` first, so this was never wrong, only
eventually slow on an experiment with a very large number of runs.
`TypeOrmTrainingRunRepository.findByCaptureStatus()` issues two genuinely
different query shapes, not one - `complete`/`partial` filter on
`capture_status ->> 'status' = :value`, `unknown` filters on
`capture_status IS NULL` directly, not a derived expression - so migration
`1788995000000` adds two indexes, not one: a composite expression index on
`(experiment_id, capture_status ->> 'status')` for the first shape, and a
partial index on `experiment_id` `WHERE capture_status IS NULL` for the
second. Deliberately not one composite index serving both by querying
`capture_status ->> 'status' IS NULL` for `unknown` instead - that would
subtly loosen the sentinel semantics §2.27 depends on (NULL means "never
reported"; a hypothetical malformed non-null object missing a `status` key
would also match the expression, even though nothing in this codebase can
ever write one). `EXPLAIN` against the real database with `enable_seqscan =
off` confirms the planner picks each index for its matching query shape.

**`update_capture_status(status=)` had no client-side validation**, unlike
`list(capture_status=)`'s check against the same three values - inconsistent,
though never unsafe, since the backend's `@IsIn(['complete','partial',
'unknown'])` DTO validator already rejected anything else. Fixed by adding
the identical check `list()` already had, before the request is built.

Verified: migration runs and reverts cleanly against the real database
(confirmed both indexes present via `\d training_runs`, both gone after
revert); backend suite (107 unit + e2e combined via `npm test`'s shared
config, 101 via `test:e2e` alone) and lint unchanged. SDK suite: mypy
clean, same 2 pre-existing unrelated failures, new test confirming
`update_capture_status()` now rejects a bad status before any request is
sent (`backend.requests == []`).

### 2.30 `experiment.training()` defaults `name` to `model`, the asymmetry §2.23 flagged

§2.23 noted `experiment.training()` had no equivalent of
`experiment.generation()`'s `_default_generation_name()` - the backend
requires `name`, so `experiment.training(model="yolo")` with no `name=`
raised a real 400 from the real backend, confirmed by re-running the exact
failing call from §2.23 against the live server before this fix (it now
succeeds, and the created run's `name` is `"yolo"`, confirmed independently
via `GET`).

Fixed the same way `generation()` already handles it: only at the fluent
`ExperimentHandle.training()` layer, not inside
`TrainingRunsAPI.create()`/`client.training_runs.create()` itself, which
keeps `name` optional-but-then-omitted exactly as before - matching
`GenerationsAPI.create()` requiring `name` explicitly while only
`ExperimentHandle.generation()` derives a default. `_default_training_name()`
mirrors `_default_generation_name()`'s shape: falls back to a plain
`"training_run"` string if `model` is missing or not a non-empty string
(the same defensive fallback `generation()` has for a missing `generator`),
though in practice `training_runs.create()`'s `model` parameter has no
default of its own, so this only bites a caller who somehow bypasses that.

### 2.31 `TrainingRun.datasets` was permanently empty against the real backend - now genuinely populated

Discovered while reviewing PR #86: `GET`/`list` responses for a training run
never included a `datasets` field at all (confirmed via `grep` across the
whole `training-runs` module - zero references), yet the SDK's own test
(`test_datasets_are_attached_after_create_and_run_is_refetched`) asserted
against a *mocked* response that fabricated one. The SDK model and the
`add_dataset()`/refetch flow were built assuming a backend capability that
was never actually wired up - `TrainingRunDatasetReferenceRepository
.findForTrainingRun()` already existed, correctly ownership-scoped, and was
never called from anywhere.

Fixed on the backend, not by narrowing the SDK's claim: `GetTrainingRunService`
and `ListTrainingRunsService` now call `findForTrainingRun()` (extended with
`.leftJoinAndSelect('reference.datasetVersion', ...)`, since the existing
query only ever loaded the raw junction row) and populate a transient
`datasets` field on the returned `TrainingRun` entities - not a real column,
populated by the service layer, the same pattern `capture_status` uses for
"computed by request time" data, except here every read path populates it
with a real (possibly empty) list rather than distinguishing "never
reported." `CreateTrainingRunService` sets `datasets = []` directly, no
query needed - a reference can only be created by a separate, later request,
so none can exist yet at creation time.

**Verified end-to-end against the real backend and Postgres, not just the
existing mocked SDK test**: created a real training run, attached a real
dataset version, and confirmed both `GET /training-runs/{id}` and
`GET /experiments/{id}/training-runs` return it - through raw `curl` first,
then independently through the real `SynthGraphClient`
(`client.training_runs.get(...).datasets[0].id` matched the attached
version). New e2e coverage: an empty array on creation, and a populated one
on both `GET` and `list` after attaching. Backend suite: 103 e2e (2 new),
clean build, lint unchanged.

### 2.32 `client.experiments.get()` / `ExperimentHandle.refresh()` 404'd against the real backend

Found while auditing whether the backend was up to date with everything the
SDK had grown to expect. `Routes.experiment(experiment_id)` builds a bare
`GET /experiments/{id}` - the same flat, top-level shape every other
single-GET route uses (`training-runs`, `generations`, `assets`, `datasets`,
`evaluation-results`). Experiments was the one outlier: the backend only ever
exposed the resource nested under its project,
`GET /projects/{projectId}/experiments/{experimentId}`. Confirmed live via
`curl`: the bare route returned a plain Nest routing 404 ("Cannot GET"), the
nested route returned the experiment. No test anywhere exercised a
single-experiment `GET` at all, nested or flat, which is why this sat
unnoticed - `m3-project-experiment.e2e-spec.ts` covered create and list only.

Fixed on the backend, matching the SDK's existing (correct) expectation
rather than degrading the SDK to the inconsistent nested shape.
`ExperimentsController` moved from a class-level `projects/:projectId`
prefix to per-route paths (the same style `TrainingRunsController` already
uses to mix nested and flat routes in one controller), and gained a new
`GET experiments/:experimentId` route. It reuses
`ExperimentRepository.findByIdForUser()` - a method that already existed,
correctly ownership-scoped via the `experiment -> project -> user` join, and
was never called from anywhere. The nested route is unchanged and still
works, so nothing that depended on it broke.

**Verified live end-to-end**, not just via the test suite: created a real
project and experiment through the running dev server, confirmed
`GET /experiments/{id}` now returns the experiment (previously 404'd),
confirmed a nonexistent ID still correctly 404s with the application's own
"Experiment not found" (not the routing-level 404), and cleaned up the
verification data from Postgres afterward. New e2e coverage in
`m3-project-experiment.e2e-spec.ts`: successful GET via both the nested and
flat routes, cross-user isolation on the flat route, and a 404 case for the
flat route on top of the pre-existing nested-route ones - 4 new tests.
Backend suite: 107 e2e (4 new), clean build, lint unchanged (pre-existing
warnings elsewhere untouched).

### 2.33 `TrainingRun.model`/`.framework`/`.framework_version`/`.config` were permanently empty on read

Found while building CLI training-run support (`synthgraph training-runs
get`/`list`) - the natural next step needed these fields to actually display
something. §2.14 documents the write side: `training_runs.create()` maps
`model=`/`framework=`/`framework_version=`/`config=` onto the wire's
`trainer`/`parameters` shape. Nothing mapped the other direction. The
`TrainingRun` model declared flat `model`/`framework`/`framework_version`/
`config` fields, but the wire never sends those names - only nested
`trainer: {name, type, version}` and `parameters: {...}` - so every
`TrainingRun` parsed from a real `GET` response had all four fields
permanently `None`/`{}`, silently. No test caught it: the existing
`TRAINING_RUN` test fixture already had `trainer`/`parameters` populated, but
nothing ever asserted `run.model` or `run.config` against it.

**Verified live before fixing**: created a real training run via `curl`
with `trainer: {"name":"yolo","type":"pytorch","version":"2.1"}`, then
fetched it through the real `SynthGraphClient` - `run.model`, `.framework`,
`.framework_version` were all `None` and `.config` was `{}` despite the
data being right there in the response body.

Fixed with a `model_validator(mode="before")` on `TrainingRun` that lifts
`trainer.name` -> `model`, `trainer.type` -> `framework`, `trainer.version`
-> `framework_version`, and `parameters` -> `config` before field
validation runs, using `setdefault` so an explicit flat value (should the
wire ever send one) is never overwritten. Re-verified live afterward with
the same training run: all four fields now populate correctly. New unit
test (`test_get_reads_trainer_and_parameters_back_onto_flat_fields`)
locks this in independently of the create-side fixture. Full suite: all
training/fluent tests pass; `mypy` clean.

### 2.34 `synthgraph training-runs` - the CLI had zero training-run support

The CLI's own stated purpose is to "inspect and export provenance after the
fact" (main.py's help text), and every other resource capture had a matching
read-side command group (`experiments`, `generations`) except training
runs - the whole capture-completeness audit this project exists around
(2.27, 2.28) had no CLI surface at all, only `sg.training_runs.list
(capture_status=)` in Python.

**Decision:** new `synthgraph training-runs` group, matching the read-only
scope every other group already has - no `create`/`start`/`complete`/
`log-metric` commands, since those belong inline in training code via the
SDK, not typed at a shell prompt after the fact. Three commands:

* `list --experiment <id> [--capture-status complete|partial|unknown]` -
  the audit query itself, exposed directly. A `None` `capture_status` (2.27's
  "never reported" sentinel) renders as `never reported` in the table
  rather than blank, so it reads as a distinct state, not missing data.
* `get <id>` - full field list including `capture_status`, `datasets`, and
  the `model`/`framework`/`framework_version`/`config` fields fixed by 2.33
  (this command is exactly why 2.33 got caught: it was the first thing to
  actually render them).
* `metrics <id>` - the per-step metric points, ordered by step.

**Verified live end-to-end**, not just against the mock backend: created a
real training run via `curl`, then ran the actual `synthgraph.exe` console
script against it through every command above - `list` (including the
`never reported` label and a live `--capture-status` filter round-trip
after reporting one via `curl`), `get` in both table and `--json` form, and
`metrics` after logging a real point. Verification data cleaned up from
Postgres afterward. New test file `tests/cli/test_training_runs.py` (16
tests) plus `training-runs` added to `test_main.py`'s registered-groups
list. `ruff` and `mypy` clean.

### 2.35 `synthgraph evaluations` - the same CLI gap as 2.34, one resource over

Same shape as 2.34: `EvaluationsAPI` (`get`/`list`) already existed in the
SDK, `training.evaluations()` already existed on the fluent handle, and
there was no CLI surface at all. Unlike `TrainingRun`, `EvaluationResult` is
already a flat model (`training_run_id`, `dataset_version_id`, `name`,
`metrics`), so this one had no equivalent of 2.33's read-mapping bug to
find - confirmed by checking the model before writing the command, not
after being burned again.

**Decision:** `synthgraph evaluations list --training-run <id>` /
`evaluations get <id>`, read-only, no `create`, matching 2.34's reasoning
exactly (evaluations are recorded inline in training/eval code via the
SDK, not typed at a shell prompt afterward).

**Verified live end-to-end**: created a real project, experiment, training
run, dataset version and evaluation result via `curl`, then ran the real
`synthgraph.exe` console script through `evaluations list` and
`evaluations get` (table and `--json`) against it. Verification data
cleaned up from Postgres afterward. New test file
`tests/cli/test_evaluations.py` (8 tests) plus `evaluations` added to
`test_main.py`'s registered-groups list. `ruff` and `mypy` clean.

### 2.37 `sg.assets`/`sg.datasets` gain `get`/`list`/`get_version`/`list_versions`

Found during the same backend audit that produced 2.32/2.33: the backend
has always had working, ownership-scoped single-GET and list routes for
assets and datasets (`GET /assets`, `GET /assets/{id}`,
`GET /assets/{id}/versions`, `GET /asset-versions/{id}`, and the dataset
equivalents) - confirmed live via `curl` at the time - but the SDK only
ever called the `POST` routes, from inside `create()`'s three-step flow.
There was no way to look an asset or dataset back up by ID once
`create()` returned, short of dropping to raw HTTP.

**Decision:** add the four missing read methods to both `AssetsAPI` and
`DatasetsAPI`, matching the shape `TrainingRunsAPI`/`EvaluationsAPI`
already use (`get`, `list`, plus version-level `get_version`/
`list_versions` here since assets/datasets have two levels of identity
where training runs/evaluations only have one). Two new route builders
needed adding per resource (`Routes.asset()`/`.asset_version()`,
`Routes.dataset()`/`.dataset_version()`) - the plural list routes already
existed for `create()`'s `POST`, reused here for `GET`. No CLI surface yet;
that's a natural follow-up but wasn't asked for alongside this.

**Verified live end-to-end**: created a real asset and dataset (each with
a version) via `curl`, then called all eight new methods
(`get`/`list`/`get_version`/`list_versions` × 2) through the real
`SynthGraphClient` and confirmed each returned the right record.
Verification data cleaned up from Postgres afterward. New tests in
`tests/test_assets.py`/`tests/test_datasets.py` (4 each). `mypy` and
`ruff` clean on every file this touched (two pre-existing, unrelated
`UP017` datetime-alias suggestions in both files predate this change and
are left alone).
