# Design: recorded lineage, and removing the guessed edges

Status: **approved 2026-10-30 (owner decisions in the registry, section 2a). PRs 1, 2 and 3 of 5 are implemented; the rest are not.**
Closes: registry entry ARCH-004.

## Problem

`docs/frontendarchitecture.md` says the frontend must not infer lineage from timestamps. When no link is recorded, the lineage graph draws dashed edges guessed from when a generation finished and when a run started (`synthgraph-frontend/src/features/experiments/lineage-model.ts`). In the Phase 1 experiment, 15 of 16 generations had no recorded link, so most of that graph is a guess.

## Approved decisions

- A dataset can be reused across experiments **within one project**; across projects it cannot (MVP). The backend enforces this.
- A generation can produce many dataset versions; a training run can consume many; an evaluation references the one exact dataset version it was scored against.
- References are exact and immutable (no route updates or deletes a dataset version, a reference, or an evaluation's dataset version).
- A timestamp inference is never shown as confirmed provenance, and existing guesses are never converted into recorded relationships.
- The inferred edges are removed only after the replacement is verified.

## What exists today

- Generation to dataset version (`generation_dataset_refs`), training run to dataset version (`training_run_dataset_refs`), and evaluation to dataset version (NOT NULL foreign key) are recorded. Many-to-many already holds for the first two.
- A dataset was owned by a user only, so one dataset could be referenced from several projects. **There was no project on a dataset**, so "same project" had no definition.
- There is **no direct generation-to-run link**. For simulator-driven training the generations produce no dataset, so there is nothing to link through. That gap is why the frontend guesses.

## Plan: five small pull requests

1. **Project scope for datasets (backend). Implemented.**
   - `datasets.project_id`, nullable, additive, no backfill. Every existing dataset starts unscoped.
   - Every write that references a dataset version (generation reference, run reference, evaluation) calls one service. A dataset scoped to another project is rejected with 409 `cross_project_reference` and nothing is written. An unscoped dataset is scoped to the referencing project in the same request, atomically, so two simultaneous first references from different projects cannot both win.
   - Datasets that already have references decide by them: none, or only this project, scopes it; exactly one other project rejects (that is its project, and a failed request does not scope it); two or more projects leaves it unscoped and accepts the reference, because it cannot be attributed to one. Existing references are never changed or revalidated.
   - `projectId` is returned on dataset responses.
2. **Recorded generation-to-run link (backend). Implemented.**
   - Table `training_run_generation_refs(training_run_id, generation_id, created_at)`, primary key `(training_run_id, generation_id)`, both foreign keys `ON DELETE RESTRICT`, additive, no rows added. No `role`.
   - `POST /training-runs/:id/generations` with `{ generationId }` returns 201 with `{ trainingRunId, generationId, generationName, experimentId, createdAt }`; 404 when the run or the generation is not the caller's; 409 for a duplicate (settled by the primary key, so two identical simultaneous requests give one 201 and one 409); 409 `cross_project_reference` when the generation is in another project. `GET` lists them oldest first, paginated.
   - `generationReferences: [{ generationId, generationName, experimentId, createdAt }]` on the run, on the experiment's run list and on the workspace; an empty list means none was recorded. No existing field changes.
   - A generation in another experiment of the same project is allowed. No route updates or deletes a link.
3. **SDK and CLI 0.6.0. Implemented.** `training.use(generation)` records the link to the generation and still attaches the datasets it produced (a generation that produced none is now fine); `experiment.training(..., generations=[...])`; `training.link_generation()`; `training.generations()`; `synthgraph training-runs link-generation` and `generations`. A generation or dataset of another project is refused by the SDK before anything is created where it can see the mismatch (so a rejected attach leaves no dataset version or run behind), and by the backend otherwise. `datasets=[generation]` stays a statement about data and does not record the link. Contract: `CONTRACT.md` 2.43.
4. **Frontend draws recorded links.** Generation-to-run edges appear solid. A generation from another experiment of the project is an external node showing its name. The guessed edges are still shown and still labelled.
5. **Remove the inference.** Delete the timestamp edges, `inferredEdgeCount`, the legend and the "includes inferred links" note. An unlinked generation is shown as unlinked with no edge. Ships only after 4 is verified and the owner agrees to the visible cost below.

## Known limits (MVP)

- **Existing datasets are unscoped** until something new references them, and a dataset already used by two or more projects stays unscoped and accepts references. A read-only report of datasets referenced from more than one project would show them; it is not built.
- **Scope is per dataset, not per version**: every version of a dataset belongs to the dataset's project.
- A scoped dataset's project cannot be changed through the API.
- The claim and the reference are two statements, not one transaction. If recording the reference fails after the claim (for example a database error), the dataset stays scoped to that project.
- The SDK now reads a reused dataset before creating a version, so a cross-project attach is refused first. A dataset with no recorded project cannot be checked by the SDK, so a backend refusal there (the dataset is already used by exactly one other project) can still leave an unattached new version.
- No backfill: existing runs are linked only explicitly, through the CLI (PR 3). The dataset-based edges the graph already draws are recorded and unchanged.

## Visible cost of step 5

Until existing runs are linked, graphs for experiments like Phase 1 lose their dashed edges and show unlinked generations. That is the intended result of not showing guesses, but it means step 5 should ship after the linking path exists and the runs you care about are linked.

## Not in this design

Generation-to-generation lineage, asset project scope, and any change to how dataset-based lineage is built.
