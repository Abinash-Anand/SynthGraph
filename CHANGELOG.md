# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
This project does not yet have tagged releases - entries accumulate under
`Unreleased` until the first version is cut.

## [Unreleased]

### Added
- SDK/CLI 0.4.0: declare a metric's direction (`maximize`, `minimize`,
  `neutral`) per experiment with `experiment.declare_metric_directions()`,
  `experiment.training(metric_directions=...)` or `synthgraph metrics
  set-direction`; read it back with `metrics list`; correct it on purpose with
  `correct-direction --note`. A conflicting declaration raises
  `SynthGraphMetricDirectionConflictError` and changes nothing. Nothing is
  inferred from a metric's name and the integrations do not declare
  automatically.
- MIT license
- CI (GitHub Actions): backend lint/build/unit/e2e and frontend
  lint/typecheck/build on every PR
- Per-IP rate limiting, tightened on `/auth/login` and `/auth/register`
- Pagination (`limit`/`offset`) on every previously-unbounded list endpoint
- `POST /training-runs/:id/metrics/batch` for logging many training steps
  in one request
- PATCH (rename) and DELETE (archive) routes for Project, Experiment,
  Dataset, and Asset
- A consistent, additive `normalized` shape on every Generation-returning
  response
- `CONTRIBUTING.md`, `SECURITY.md`, issue/PR templates
- SDK/CLI 0.6.0: `training.use(generation)`, `training.link_generation(generation)` and
  `experiment.training(..., generations=[...])` record that a run used a generation, and
  `synthgraph training-runs link-generation` does it for existing runs. A generation of
  another project, or reusing a dataset of another project, is refused before anything
  is created (`SynthGraphCrossProjectReferenceError`). `use(generation)` no longer
  fails for a generation that produced no dataset.
- `GET /reports/capture-completeness/runs` lists the runs behind the capture report's counts with what is
  wrong with each one's capture, and `GET /reports/capture-completeness` gains `integrations` (left open,
  close rate, coverage). The Capture Completeness page shows the backend's answer. Its "unknown" list now
  includes runs that explicitly reported `unknown`, which the report already counted.
- `GET /reports/experiment-attention?experimentId=` and `attention` on `GET /experiments/:id/workspace`:
  which training runs need a look (failed, capture partial, unknown or never reported, drift) and which
  checks that covers. The Overview now shows the backend's answer instead of working it out itself.
- `POST /training-runs/:id/generations` records that a training run used a generation (same project
  required, other experiments allowed) and `GET` lists them; training runs now include
  `generationReferences`. Existing runs have none until one is recorded.
- Evaluation results record an optional `checkpointStep` (the training step the
  evaluation was taken at): `POST /training-runs/:id/evaluations` accepts it, and it
  is returned everywhere an evaluation is. SDK/CLI 0.5.0:
  `training.evaluation(..., checkpoint_step=N)`. Evaluations recorded before this
  have none, and it is never read from the evaluation name.

### Changed
- The lineage graph no longer guesses links from timing. Every edge is a recorded relationship; a
  generation with no recorded link is shown without a line. Link existing runs with
  `synthgraph training-runs link-generation` or `training.use(generation)`. The dashed edges, the
  "inferred from timing" legend entry and the "includes inferred links" note are gone.
- The lineage graph draws a generation recorded as used by a training run as a solid edge, even when
  the generation produced no dataset, and shows a generation from another experiment of the project as
  its own node. A run that recorded its generations is no longer guessed to have used another one.
  The dashed timing guesses for everything else are unchanged for now.
- A dataset is now used within one project. The first generation, training run or evaluation
  that references a dataset scopes it to its project (`projectId` on dataset responses), and a
  reference from another project is rejected with 409 `cross_project_reference`. Reuse across
  experiments of the same project is unchanged. Existing datasets start unscoped; none is changed
  by the migration.
- The dashboard no longer guesses which direction of a metric is better from its
  name. It reads the direction declared through the SDK and the backend's health
  verdict: a best run, a frontier, a "higher is better" label or an improving/
  worsening colour appears only for a metric with a declared direction. Metrics
  that were never declared show highest and lowest instead, and the Efficiency
  Leaderboard asks the user to choose a direction for the view (not saved)
  rather than assuming "higher". Experiments recorded before directions existed
  show none until someone declares one.
- The evaluation-checkpoint chart no longer reads a step out of an evaluation's name. It
  plots on the recorded checkpoint step when every plotted evaluation has one, and by
  recorded order, with a note, when any does not. Evaluations recorded before checkpoint
  steps existed show "Not recorded" until they are re-recorded with a step.

### Fixed
- CORS now requires an explicit origin allowlist in production, instead of
  reflecting any origin
- JWT_SECRET is now rejected at startup in production if unset or left at
  its insecure default
- Referencing the same dataset version from a generation under a second
  role no longer incorrectly conflicts
- An unindexed JSONB regex scan on the training-run numeric-filter search
  is now backed by GIN indexes
