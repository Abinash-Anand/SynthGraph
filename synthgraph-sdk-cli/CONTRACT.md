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
| Record dataset | `sg.datasets.create()` | — | POST | `/generations/{generationId}/datasets` |
| Reproduction manifest | `sg.reproduction.get(id)` | `manifest` | GET | `/generations/{generationId}/reproduction-manifest` |
| Documentation | `sg.documentation.get(id)` | `docs` | GET | `/generations/{generationId}/documentation` |
| Compare | `sg.comparisons.compare([...])` | `compare` | POST | `/generations/compare` |

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

### 2.9 Environment and Git capture are opt-in

Nothing is collected automatically (§31, §32). `git_metadata()` strips
credentials from remote URLs and returns `{}` outside a repository.
`environment_metadata()` collects five fixed fields plus versions of packages
the caller names.

### 2.10 The CLI takes no `--api-key`

Credentials come from `SYNTHGRAPH_API_KEY` only. A command-line option would
land the key in shell history and process listings (§57).

### 2.11 The CLI does not write

No `projects create`, no `generations create`, no `reproduce`. Capture belongs
to the SDK, and running research tooling belongs to the researcher (§58, §59).

### 2.12 `SYNTHGRAPH_API_URL` is the configuration name

It matches the existing `SynthGraphConfig.api_url` field. `SYNTHGRAPH_BASE_URL`
is accepted as an alias because the spec text uses that spelling.

---

## 3. UNVERIFIED — routes that need checking against the backend

Spec §63 explicitly refuses to freeze these until the backend controllers are
inspected, and that inspection has **not** happened: no backend source was
available when this client was built.

All of them live in `src/synthgraph/routes.py` and are listed in
`routes.UNVERIFIED_ROUTES`, so reconciling them is a one-file change.

| Operation | Assumed route | Assumed payload |
|---|---|---|
| Create training run | POST `/experiments/{id}/training-runs` | `{model, framework, framework_version, config, datasets, status, metadata}` |
| List training runs | GET `/experiments/{id}/training-runs` | — |
| Get training run | GET `/training-runs/{id}` | — |
| Attach dataset | POST `/training-runs/{id}/datasets` | `{id}` |
| Create evaluation | POST `/training-runs/{id}/evaluation-results` | `{name, metrics, dataset_version_id, metadata}` |
| Get evaluation | GET `/evaluation-results/{id}` | — |
| List evaluations | GET `/training-runs/{id}/evaluation-results` | — |
| Asset references | POST `/generations/{id}/assets` | not yet used by any SDK method |

They follow the naming convention the verified routes use: collections hang off
their parent, single resources are addressed at the top level. That is a
reasonable inference, not a contract.

**To close this section:** read `src/training-runs/` and
`src/evaluation-results/` (or the equivalent modules) in the backend, correct
`routes.py` and the payload builders, then run:

```bash
SYNTHGRAPH_INTEGRATION_TESTS=1 SYNTHGRAPH_INTEGRATION_TRAINING=1 pytest -m integration
```

The training/evaluation integration test is behind its own flag precisely
because it asserts an unverified contract.

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
- [ ] training-run and evaluation-result routes and payloads (section 3)
- [ ] comparison response schema
- [ ] whether `POST /generations/{id}/datasets` returns a `DatasetVersion`, a
      link object, or the parent `Dataset`
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
