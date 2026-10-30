# Design: declared metric direction

Status: **proposed, awaiting owner review.** Nothing in this design has been implemented.
Closes: registry entries ARCH-001 and ARCH-006 (the metric-direction part).
Decision it implements (2026-10-30): an optional field supplied when the metric is logged, SDK to API; unknown stays neutral.

## Problem

Whether higher or lower is better for a metric is guessed in the frontend from words in its name (`synthgraph-frontend/src/shared/lib/metric-semantics.ts`). Nothing in the backend or the SDK declares it. The guess drives the green and orange health colours, "improving / worsening" counts, Best Runs, the efficiency leaderboard, the run comparison and the parameter analysis. It is wrong for names the lists do not cover and for spread metrics, and a different client could not reproduce it.

## What exists today

- `TrainingHandle.log_metric(step=, metrics={...})` and `TrainingHandle.evaluation(metrics={...})` in `synthgraph-sdk-cli/src/synthgraph/fluent.py` send free-form metric dictionaries. There is no place to say what a metric means.
- The backend stores them as JSONB (`training_run_metrics.metrics`, `evaluation_results.metrics`).
- The backend's health report returns a directionless trend (`increasing`, `decreasing`, `flat`, `insufficient_data`). The Best Runs report returns the maximum and the minimum and deliberately leaves "which is better" to the UI.

## Proposal

### 1. Data (backend)

Store the declaration on the **training run**, because a metric's meaning belongs to the code that logs it:

- New column `training_runs.metric_directions jsonb not null default '{}'`: a map from metric key to `"minimize" | "maximize" | "neutral"`.
- Keys are matched exactly first, then by the longest declared prefix pattern ending in `/*` (for example `eval/episode_reward/*: maximize`), because one RL run can log dozens of related reward terms. No other wildcard syntax.
- Validation: values must be one of the three; at most 500 entries; keys at most 200 characters. Anything else is a 400.
- A metric with no matching declaration has **no direction** (unknown). It is never guessed.

Migration: `AddMetricDirectionsToTrainingRuns`, additive, default `{}` for every existing row. The migration is yours to run.

### 2. API (additive)

- `POST /experiments/:id/training-runs` accepts an optional `metricDirections`.
- New `PUT /training-runs/:id/metric-directions` merges declarations into the run (so a run can declare late, or add keys as it logs new ones).
- The training-run response gains `metricDirections` (always present, `{}` when none). No existing field changes.
- The health report gains, per metric, `direction` (or `null`) and `verdict` (`improving`, `worsening`, `neutral`), computed in the backend from the trend and the declared direction. The backend decides the verdict; the frontend renders it.
- Reports that span runs (Best Runs, efficiency leaderboard) return `direction` per metric: the common declared direction if every run that reports the metric declares the same one, `neutral` with `directionConflict: true` if they disagree, `null` if none declared. They then also return `best` only when a direction exists.

### 3. SDK and CLI

- `experiment.training(..., metric_directions={"loss": "minimize", "eval/episode_reward/*": "maximize"})` and `training.declare_metrics(...)`.
- The framework integrations (`integrations/stable_baselines3.py`, `skrl.py`, the MuJoCo Playground integration) declare directions for the metrics they themselves define, since an integration knows what its own `loss` or `ep_rew_mean` means. That is explicit knowledge in code, not a guess about arbitrary names.
- CLI: `synthgraph training set-direction RUN KEY DIRECTION`, so existing runs can be declared without re-logging.
- Bump the SDK minor version and update `CONTRACT.md`.

### 4. Frontend

- Read `metricDirections` / `direction` / `verdict` from the API; compute none.
- Remove the keyword lists and `judgeTrend` from `metric-semantics.ts` and `trend-judgement.ts`. Unknown shows neutral, with the existing "no direction declared" wording.
- Keep a clear separation: `metricKind` (is this a time, system or throughput reading?) is a second name-based guess used for grouping. It is not a direction. It stays for now and is recorded as a remaining item rather than hidden.

## Rollout order

1. Backend: migration, validation, API, health and reports. Deploy and run the migration.
2. SDK: release with the new arguments and the integrations' declarations.
3. Frontend: read the declared directions, with the name-based inference kept only as a labelled fallback for undeclared metrics.
4. Backfill route for existing runs (the CLI command above, or a small page in the app).
5. **Remove the inference** (a separate, last commit).

Step 5 is the visible cost of your decision: until existing runs have declarations, their health colours, "best" values and efficiency rankings go neutral. It should ship only after step 4, or with your explicit agreement that existing data goes grey.

## Tests

- Backend: validation, prefix matching and precedence, merge behaviour, the health verdict for each direction and for unknown, cross-run agreement and conflict, end-to-end against a real database.
- SDK: the new arguments reach the request; each integration declares what it says it declares.
- Frontend: no direction is derived from a name; an undeclared metric renders neutral; the verdict is rendered as received.

## Open questions for you

1. Should prefix patterns (`eval/episode_reward/*`) be supported, or exact keys only? Patterns are practical for RL runs with dozens of reward terms.
2. When two runs declare different directions for one metric, is "neutral with a conflict flag" right?
3. For existing runs: leave them grey after step 5, or ship the backfill route first? (Recommended: backfill first.)
4. Should the integrations' built-in declarations be treated as overridable by the user? (Recommended: yes; an explicit user declaration wins.)

## Not in this design

Units, target values or thresholds for metrics, and any change to how `metricKind` groups readings.
