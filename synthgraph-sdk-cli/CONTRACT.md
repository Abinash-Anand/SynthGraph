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
| Reproduction manifest | `sg.reproduction.get(id)` | `manifest` | GET | `/generations/{generationId}/reproduction-manifest` |
| Documentation | `sg.documentation.get(id)` | `docs` | GET | `/generations/{generationId}/documentation` |
| Compare | `sg.comparisons.compare([...])` | `compare` | POST | `/generations/compare` |
| Create training run | `sg.training_runs.create()` / `experiment.training()` | — | POST | `/experiments/{experimentId}/training-runs` |
| List training runs | `sg.training_runs.list()` / `experiment.training_runs()` | — | GET | `/experiments/{experimentId}/training-runs` |
| Get training run | `sg.training_runs.get(id)` | — | GET | `/training-runs/{trainingRunId}` |
| Training run lifecycle | `.start()` `.complete()` `.fail()` | — | PATCH | `/training-runs/{trainingRunId}` |
| Attach dataset to training run | `sg.training_runs.add_dataset()` | — | POST | `/training-runs/{trainingRunId}/datasets` |
| Create evaluation | `sg.evaluations.create()` / `training.evaluation()` | — | POST | `/training-runs/{trainingRunId}/evaluations` |
| Get evaluation | `sg.evaluations.get(id)` | — | GET | `/evaluation-results/{evaluationResultId}` |
| List evaluations | `sg.evaluations.list()` / `training.evaluations()` | — | GET | `/training-runs/{trainingRunId}/evaluations` |

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

---

## 3. UNVERIFIED — routes that need checking against the backend

Spec §63 explicitly refuses to freeze a route until the backend controller
behind it has been inspected. Training-run, dataset and evaluation-result
routes have now been read from the backend source and corrected (section 1);
this section is left with only the one route inspection never covered.

| Operation | Assumed route | Assumed payload |
|---|---|---|
| Asset references | POST `/generations/{id}/assets` | not yet used by any SDK method |

It follows the naming convention the verified routes use: a collection hangs
off its parent. That is a reasonable inference, not a contract.

Two smaller unknowns in the same category:

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
- automatic instrumentation, hooks, decorators (v1.2, §10)
- CLI write commands (§58)
- `synthgraph reproduce` (§59)
- dataset or asset upload (§6)

---

## 5. Known defect in the inherited package metadata

v0.1.0 declared `pydantic>=2.0,<3.0` while `models/generation.py` uses
`Field(exclude_if=...)`, which requires pydantic 2.12+. On pydantic 2.0–2.11
that package would install and then fail. The floor is now `>=2.12`.
