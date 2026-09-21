# Reconciled Contract — Draft (for review, not yet implemented)

Covers the 5 items from the review round: dataset create, training-run create,
evaluation create, project/experiment DTO validation, generation-dataset-reference
ownership check. Each item states the agreed shape/fix, which side(s) change, and
anything that needs your decision before implementation starts.

---

## 1. Dataset create — real two-step flow, not a shortcut

**Confirmed from `models/dataset.py`:** the SDK already models `Dataset` (logical
identity) and `DatasetVersion` (immutable version) as separate types — the domain
model distinction exists in the SDK's type layer already, it's just not used by
`DatasetsAPI.create()` yet.

**Final flow** (three backend calls, orchestrated by one SDK method so the caller's
experience doesn't change):

1. `POST /datasets` — `{name, description?, metadata?}` → `Dataset`
2. `POST /datasets/{datasetId}/versions` — `{version, uri, format?, size?, checksum?, metadata?}` → `DatasetVersion`
3. `POST /generations/{generationId}/datasets` — `{datasetVersionId, role}` → `GenerationDatasetReference`

**Which side changes:** SDK only. All three backend routes/DTOs already exist and
are correct as-is ([datasets.controller.ts](../synthgraph-backend/src/datasets/controllers/datasets.controller.ts)). `DatasetsAPI.create()` in
[datasets.py](../synthgraph-sdk-cli/src/synthgraph/datasets.py) gets rewritten to make all three calls; `GenerationHandle.dataset(name=, uri=, **kwargs)`
in [fluent.py](../synthgraph-sdk-cli/src/synthgraph/fluent.py) keeps its current one-call signature so existing example scripts
(e.g. the README's `generation.dataset(name="rain_v1", uri="/data/rain_v1")`) don't
change. Return type stays `DatasetVersion`.

**Needs your input:**
- **Dataset identity reuse.** If `generation.dataset(name="rain_v1", ...)` is called
  again later with the same name, should the SDK create a second `Dataset` row, or
  find-and-reuse the existing one? There's no "get dataset by name" backend route —
  only `GET /datasets` (list all for the user). I'd suggest: always create a new
  `Dataset` unless the caller passes an explicit `dataset_id=` to reuse — avoids a
  client-side name-search hack — but this is a real modeling choice, not just plumbing.
- **`version` default.** The backend's `CreateDatasetVersionDto.version` is
  required, but the SDK's current signature makes it optional. Auto-generating one
  (e.g. `v1`, `v2`, ...) needs an extra lookup; a timestamp default is arbitrary. I'd
  lean toward just making `version` a required kwarg on the SDK method — simplest and
  most honest — but flagging in case you want an auto-default instead.
- **`role` default.** The backend's `CreateGenerationDatasetReferenceDto.role` is
  required, but the SDK's current signature makes it optional. What should
  `generation.dataset()` default to when the caller doesn't pass one — `"output"`?

---

## 2. Training run create — the dataset link exists, just via a separate endpoint

**Answering your specific question:** yes, the backend has a way to link a
`TrainingRun` to the `DatasetVersion`(s) it consumed — but it's not a field on
`CreateTrainingRunDto`. It's a dedicated endpoint, `POST /training-runs/{id}/datasets`
with `{datasetVersionId, role}` ([create-training-run-dataset-reference.service.ts](../synthgraph-backend/src/training-runs/services/create-training-run-dataset-reference.service.ts)),
mirroring exactly the generation-dataset-reference pattern in item 1. So this is a
**shape mismatch, not a missing capability**: the SDK currently packs `datasets` into
the create-call body, where the backend silently ignores it (extra fields aren't
whitelisted into `CreateTrainingRunDto`).

**Final `create()` shape:**
- `POST /experiments/{id}/training-runs` — `{name, description?, trainer, parameters, metadata?}`,
  no `datasets` field.
- Then one `POST /training-runs/{id}/datasets` call per dataset passed in, same as
  `add_dataset()` already does.

**Field mapping** — the backend's `trainer: {name, version?, type?}`
([training-run.entity.ts](../synthgraph-backend/src/database/entities/training-run.entity.ts)) is structurally identical to `Generator` (used for
`generations.generator`). Proposed mapping, which keeps the SDK's current ergonomic
kwargs unchanged for callers:
- `model` → `trainer.name`
- `framework` → `trainer.type`
- `framework_version` → `trainer.version`
- `config` → backend's `parameters`
- `status` — dropped from `create()`. The backend DTO has no `status` field (every
  training run starts `pending`, same as generations); the SDK's `status=` kwarg
  currently sends a value the backend can't accept.

**Which side changes:** SDK only for the shapes above. `add_dataset()` needs a `role`
kwarg added (backend requires it) and its payload key changed from `{"id": ...}` to
`{"datasetVersionId": ...}`.

**Needs your input — bigger than a naming fix:** the backend has **no list route**
for training runs (`GET /experiments/{id}/training-runs` doesn't exist —
[training-runs.controller.ts](../synthgraph-backend/src/training-runs/training-runs.controller.ts) only has create/get/attach-dataset) and **no status-update
route** (no PATCH, unlike generations' lifecycle PATCH). That means
`TrainingRunsAPI.list()` and any `running`/`completed`/`failed` transition are
unreachable no matter what the SDK sends — this is missing backend functionality,
not a contract mismatch. Do you want those two routes added as part of this pass, or
tracked as a separate fast-follow so this reconciliation stays scoped to what you
listed?

---

## 3. Evaluation create — real route, required dataset link, add `name` to backend

**Route fix:** SDK's `Routes.training_run_evaluations()` changes from
`/training-runs/{id}/evaluation-results` to `/training-runs/{id}/evaluations`
(matches [evaluation-results.controller.ts](../synthgraph-backend/src/evaluation-results/evaluation-results.controller.ts)).

**`dataset_version_id`:** becomes a required kwarg on `EvaluationsAPI.create()`
(currently optional) — matches the backend's `@IsUUID()` required field, and matches
the domain model's stated rule that an evaluation always references the exact
dataset it was scored against.

**`name`:** currently the SDK sends it but the backend drops it — `EvaluationResult`
has no `name` column at all
([evaluation-result.entity.ts](../synthgraph-backend/src/database/entities/evaluation-result.entity.ts) confirmed: `id, training_run_id, dataset_version_id, metrics,
metadata, created_at`). Adding it back requires a backend migration (new nullable
`name` column) plus `name?` on `CreateEvaluationResultDto`.

**Which side changes:** both. SDK: route + required `dataset_version_id`. Backend:
new `name` column + migration + DTO field + wire it in `CreateEvaluationResultService`.

**Needs your input:**
- **`name` storage.** New real column (queryable, shows up in the entity/response),
  or fold it into `metadata.name` (no migration, but less structured)? I'd lean
  toward a real column since a name is presumably used for identification/listing,
  but it's your schema call.
- **Same missing-list-route issue as item 2:** `EvaluationsAPI.list()` calls a route
  the backend doesn't implement (there's `GET /evaluation-results/{id}` for a single
  result, but no `GET /training-runs/{id}/evaluations` list). Add now or fast-follow —
  same question as training runs.

---

## 4. Validate `POST /projects` and `POST /projects/:id/experiments` bodies

Straightforward, backend-only, no open questions. Replace the inline TS-literal
`@Body()` types in [projects.controller.ts](../synthgraph-backend/src/projects/projects.controller.ts) and [experiments.controller.ts](../synthgraph-backend/src/experiments/experiments.controller.ts) with real DTO
classes, following the existing `CreateDatasetDto` convention already used elsewhere
in the codebase:

```ts
class CreateProjectDto {
  @IsString() @IsNotEmpty() @MaxLength(255) name: string;
  @IsOptional() @IsString() description?: string;
}
// CreateExperimentDto: identical shape
```

This makes the global `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })`
already configured in `main.ts` actually apply to these two routes, closing the gap
where a missing `name` currently falls through to a raw DB NOT-NULL error instead of
a clean 400.

---

## 5. Ownership check on generation-dataset-reference attach

Straightforward, backend-only, no open questions. `CreateGenerationDatasetReferenceService.execute`
([create-generation-dataset-reference.service.ts](../synthgraph-backend/src/generations/services/create-generation-dataset-reference.service.ts)) currently checks the dataset version's ownership but never
the generation's. Add the same check its sibling
(`CreateTrainingRunDatasetReferenceService`) already does:

```ts
const generation = await this.generationRepository.findByIdForUser(generationId, userId);
if (!generation) throw new NotFoundException('Generation not found');
```
— placed before the existing dataset-version lookup, so a user can no longer attach
a dataset reference to a generation they don't own by guessing/knowing its UUID.

---

## Summary of open questions before implementation

1. Dataset reuse-by-name vs. always-create (item 1)
2. Default `version` when omitted (item 1)
3. Default `role` when omitted, for both generation and training-run dataset
   attachment (items 1 & 2)
4. Add training-run list + status-update routes now, or fast-follow (item 2)
5. `name` on evaluations: real column vs. `metadata.name` (item 3)
6. Add evaluation list route now, or fast-follow (item 3)
