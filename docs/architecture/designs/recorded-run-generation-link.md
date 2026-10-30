# Design: a recorded link between a training run and the generations it used

Status: **proposed, awaiting owner review.** Nothing in this design has been implemented.
Closes: registry entry ARCH-004.
Decision it implements (2026-10-30): remove the guessed lineage edges, and add the recorded link first.

## Problem

`docs/frontendarchitecture.md` says the frontend must not infer lineage from timestamps. When no link is recorded, the lineage graph draws dashed edges guessed from when a generation finished and when a run started (`synthgraph-frontend/src/features/experiments/lineage-model.ts`). In your Phase 1 experiment, 15 of 16 generations had no recorded link, so most of that graph is a guess.

## What exists today, and why the gap exists

- The data model records generation to dataset (`generation_dataset_refs`) and training run to dataset (`training_run_dataset_refs`). Lineage is currently built **through datasets**.
- The SDK already has `training.use(generation)`, which attaches the datasets that generation *produced* to the run (`synthgraph-sdk-cli/src/synthgraph/fluent.py`, `TrainingHandle.use`).
- There is **no direct generation-to-run relationship** in the schema.
- In Phase 1, the generations are domain-randomisation variants and the training happens in the simulator. The generations produced no dataset, so there was no dataset to link through. The relationship exists in reality but has nowhere to be recorded.

So the gap is not only recording practice. For simulator-driven training there is no way to say "this run used these generations".

## Proposal

### 1. Data (backend)

A junction table that mirrors the existing dataset-reference tables:

- `training_run_generation_refs(training_run_id uuid, generation_id uuid, role varchar default 'input', created_at timestamptz)`, primary key `(training_run_id, generation_id, role)`, foreign keys `ON DELETE RESTRICT`, an index on each foreign key.
- Ownership: the run and the generation must belong to the same user. They may sit in different experiments; the graph shows only links inside the experiment being viewed.

Migration: `CreateTrainingRunGenerationRefs`, additive. The migration is yours to run.

### 2. API (additive)

- `POST /training-runs/:id/generations` with `{ generationId, role? }`, `201` on success, `404` when either record is not the caller's, `409` on a duplicate (the same behaviour as `POST /training-runs/:id/datasets`).
- `GET /training-runs/:id/generations` lists them.
- The training-run response and the workspace route gain `generationReferences: [{ generationId, role }]` (an empty list when none). No existing field changes.

### 3. SDK and CLI

- `training.use(generation)` records the direct link **and** keeps attaching the generation's produced datasets, so existing code keeps working and gains the new link.
- `experiment.training(..., generations=[...])` as a convenience at creation, and `training.generations()` to read them back.
- CLI: `synthgraph training link-generation RUN GENERATION`, so existing runs can be linked after the fact.
- Bump the SDK minor version and update `CONTRACT.md`.

### 4. Frontend

- The lineage model draws a generation-to-run edge from `generationReferences` as recorded provenance (solid), alongside the existing dataset-based edges.
- Then, as a **separate final commit**, remove the timing-based inference and its legend and note. A generation with no recorded link is shown as unlinked, with no guessed edge.

## Rollout order

1. Backend: migration, routes, response fields.
2. SDK release and CLI command.
3. Frontend draws recorded links (the guessed edges still shown, still labelled).
4. A way to link existing runs (the CLI command above, and optionally a link action in the app).
5. **Remove the guessed edges.**

As with the metric-direction design, step 5 has a visible cost: until existing runs are linked, graphs for existing experiments lose their guessed edges and show unlinked nodes. It should ship only after step 4, or with your explicit agreement.

## Tests

- Backend: duplicate handling, ownership, deletion restrictions, the new fields on the training-run and workspace responses, end-to-end against a real database.
- SDK: `use(generation)` makes both requests and is idempotent; creation with `generations=`.
- Frontend: a recorded link renders as a solid edge; with the inference removed, an unlinked generation has no edge to any run; the lineage model contains no timestamp comparison.

## Open questions for you

1. Should a link across experiments be allowed (it is useful for a model trained on another experiment's data), or restricted to the same experiment in v1?
2. Is `role` needed (for example `input` and `evaluation`), or is a bare link enough for now?
3. For step 5: do you want a small "link this run to a generation" action in the app, or is the CLI enough?
4. Should a run created through `training.use(generation)` before this change be linked retroactively by matching on the datasets it already attached? That is a stricter, recorded-data-only backfill and is safe, but it will not cover Phase 1-style runs.

## Not in this design

Generation-to-generation lineage, and any change to how dataset-based lineage is built.
