# Design: declared metric direction

Status: **approved 2026-10-30. PR 1 (backend), PR 2 (SDK and CLI) and PR 3 (frontend) are implemented.**
Closes: registry entries ARCH-001 and, with ARCH-006's own work, the direction half of ARCH-006.

An earlier draft of this document proposed prefix patterns and per-run storage. The owner's decisions replaced both; this is the approved contract.

## Decisions (approved)

- Direction is **declared explicitly through the Python SDK**: `maximize`, `minimize` or `neutral`.
- An omitted direction is **unknown**. Metric names and prefixes never determine direction.
- Direction is **consistent within an experiment**. A conflicting declaration is **rejected** with a clear error. There is no last-write-wins.
- Existing records get **no inferred direction** and no name-based backfill. Historical corrections are **explicit**.
- The backend is authoritative for metric metadata.

## Contract

### Storage

`experiment_metric_directions(experiment_id, metric_key, direction, created_at, corrected_at, correction_note)`, primary key `(experiment_id, metric_key)`, foreign key to `experiments` with `ON DELETE RESTRICT`. The primary key is what makes "consistent within an experiment" a database guarantee, including under concurrent requests.

A declaration belongs to the experiment, so it covers that experiment's training metrics and evaluation metrics alike. Keys are exact strings of 1 to 200 characters; a key that contains `*` is just a key.

### API (additive)

| Route | Behaviour |
| --- | --- |
| `GET /experiments/:id/metric-directions` | `{ experimentId, directions: { key: direction } }`. A metric that is not listed is unknown. |
| `POST /experiments/:id/metric-directions` | Body `{ directions: { key: direction } }`, 1 to 100 keys. All or nothing in one transaction. The same direction again is a no-op. A different one returns **409** `metric_direction_conflict` with `conflicts: [{ metricKey, declared, requested }]` and writes nothing. |
| `PUT /experiments/:id/metric-directions` | The **explicit correction**. Body `{ metricKey, direction, correctionNote }`; the note is required. Only changes a metric that was declared before (404 otherwise); records `corrected_at` and `correction_note`. The key is in the body because keys contain `/`. |

Surfaced elsewhere, all additive:

- Training-run health: each metric gains `direction` (or `null`) and a backend-decided `verdict` (`improving`, `worsening`, `neutral`). No declared direction, a `neutral` direction, a flat trend or too little data all give `neutral`.
- The workspace response gains `metricDirections`.
- Parameter correlation gains `metricDirections` for its experiment.
- Best Runs and the efficiency leaderboard gain `metricDirections`, which spans experiments. A metric has a direction there only if **every experiment that reports it declares the same one**; if they differ, or only some declared it, it is `{ direction: null, mixed: true }`. A metric nobody declared is absent. Best Runs keeps reporting both extremes and picks neither.

### Migration

`CreateExperimentMetricDirections1789010000000`: additive, no data change, no backfill (every existing experiment starts with nothing declared). `down` drops the table and the enum; the only loss is the declarations themselves. Run by the owner; never by the PR.

## Rollout

1. **PR 1, backend** (this change): migration, routes, validation, health verdict, report and workspace fields.
2. **PR 2, SDK and CLI:** `experiment.declare_metric_direction(s)`, an optional `metric_directions=` argument on `training()`, reading them back, explicit correction, `CONTRACT.md`, a minor version bump. Integrations do not declare automatically in this change.
3. **PR 3, frontend:** read the declared directions and the backend's verdict, delete the name-based direction code, and stop treating an unknown direction as "higher" anywhere.

PR 3 is implemented: the frontend no longer guesses from names. Existing experiments show no direction until someone declares one, which is intended.

## Intentional MVP limitations

- Exact keys only, declared per experiment; no patterns, no per-run declarations.
- A correction keeps only the latest note (no history table).
- Integrations (stable-baselines3, skrl and the others) do not declare directions for the metrics they define. That would be knowledge keyed to a metric name and needs separate approval.
- `metricKind` (whether a metric is a time, system or throughput reading) is still inferred from names, and is labelled that way, until its own metadata design is approved.
- ARCH-006's structured checkpoint metadata is separate work.
