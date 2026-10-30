# SynthGraph architecture violation registry

Purpose: a traceable record of places where the implementation departs from SynthGraph's architecture, what each costs the people using it, and what has been done about it. Every entry was checked against the repository, not just reported.

- **Verified against:** `main` at commit `6d6916b`, 2026-10-30.
- **Method:** reading the code, running the real functions on sample inputs, and comparing screens with the documentation. No user research was done.
- **Status vocabulary:** `confirmed`, `confirmed - decision needed`, `downgraded`, `rejected`, `investigating`, `partially remediated`, `remediated`.

## 1. Principles the entries are assessed against

| Principle | Expected behaviour |
| --- | --- |
| Separation of concerns | Each layer owns its own responsibilities. |
| Backend domain authority | The backend owns domain rules, interpretations and confirmed relationships. |
| Single source of truth | A domain concept has one authoritative definition. |
| Explicit domain semantics | Meaning is declared, not guessed from names or conventions. |
| API contract consistency | Different clients receive the same domain result. |
| Presentation separation | The frontend visualises and handles interaction; it does not make independent domain decisions. |

Only one of these is written down in the repository: `docs/frontendarchitecture.md:296` - "The backend is authoritative for relationships. The frontend must not infer lineage from names, timestamps, ordering, IDs, or visual assumptions." The rest are the owner's stated principles (2026-10-30) and are not yet in the architecture docs.

## 2. Summary index

| ID | Title | Severity | Status |
| --- | --- | --- | --- |
| ARCH-001 | Metric optimisation direction is guessed from names in the frontend | Critical (see note) | confirmed |
| ARCH-002 | Parameter-analysis conclusions are computed in the frontend | High | confirmed - decision needed |
| ARCH-003 | Reproducibility scoring and grading live in the frontend | Critical (see note) | confirmed |
| ARCH-004 | The frontend infers lineage edges from timing | **High** | confirmed |
| ARCH-005 | Domain-assessment rules (attention flags, report analytics) live in the frontend | Low-Medium | confirmed (split from the original entry) |
| ARCH-006 | Evaluation comparison semantics are inferred in the frontend | Medium | confirmed |
| ARCH-007 | Competing report-generation authority | - | **rejected** |
| INV-001 | Backend health-trend quality (5-step window, 1% threshold) | - | investigating |

Severity note for ARCH-001 and ARCH-003: the verification review rated both High rather than Critical, because their user-facing signals are labelled as inferred or partial. The registry keeps the severity first recorded until the owner decides.

## 3. Violation records

### ARCH-001 - Metric optimisation direction is guessed from names

- **Where:** `synthgraph-frontend/src/shared/lib/metric-semantics.ts`, used by `trend-judgement.ts`, the run comparison, the Best Runs and Efficiency Leaderboard screens, and parameter analysis.
- **Actual behaviour:** the backend reports a directionless trend (increasing, decreasing, flat, insufficient data). The frontend decides from keyword lists in the metric's name (`loss`, `error` -> lower is better; `reward`, `score` -> higher) whether that trend is good, and colours it green, orange or grey.
- **Neither the backend nor the SDK has a concept of metric direction** (the backend's own best-runs comment calls direction "a UI-level judgment call").
- **Verified failures** (real functions run on sample names):
  - `eval/episode_reward_std` and `accuracy_std` were judged higher-is-better, so a rising spread showed as "good".
  - `collision_rate`, `failure_rate`, `fall_rate` and `violation_rate` got no direction, because the keyword lists held only the plural `collisions`/`failures` and no `violation` or `fall`.
- **Mitigations already present:** an ambiguous name (both a higher and a lower word) stays neutral; the tooltip says the direction is inferred.
- **Expected behaviour:** direction is declared explicitly (minimise, maximise, neutral, unknown) and the assessment is produced from that declaration.
- **Remediation direction:** an explicit, optional direction field. Where it is declared (SDK, API, or per experiment) is an open owner decision.
- **Acceptance criteria:** no keyword-based direction inference in the frontend; unknown direction never produces an improvement verdict; backend tests cover all four directions; data without a direction is handled safely.
- **Potential user impact:** a researcher stops or keeps a run, or reads a comparison, on a wrong colour. Likelihood medium; consequence moderate (wasted compute, misread runs); no data is corrupted.
- **Observed user impact:** none recorded. The owner could not tell what the colours meant when reviewing the screen (2026-10-30), which is a usability finding, not an incorrect result.

### ARCH-002 - Parameter-analysis conclusions are computed in the frontend

- **Where:** `synthgraph-frontend/src/features/experiments/parameter-model.ts`, `components/tabs/ParameterInsights.tsx`.
- **Actual behaviour:** the frontend computes Spearman rank correlation, eta-squared ("% of variation"), a parameter role from keyword lists, a seed noise floor and a reliability grade, and picks each run's outcome as its best evaluation. The backend supplies grouped averages and which parameters vary.
- **Guardrails present:** it refuses to rank below 5 runs, grades reliability (8 or more runs for "ok"), calls results association not cause, and treats seed-only variation as noise.
- **Open question (blocks classification):** is this an authoritative SynthGraph insight or an exploratory view? The outcome metric is chosen in the UI, and the screen leads with "What moved the outcome", which argues each way.
- **Remediation direction:** decide first. If authoritative, move the methodology to a backend service with a documented, versioned method; if exploratory, label it as such and keep it in the frontend.
- **Potential user impact:** a hyperparameter is chosen from a weak association across 5-8 runs. Likelihood low-medium.
- **Observed user impact:** none recorded.

### ARCH-003 - Reproducibility scoring and grading live in the frontend

- **Where:** `synthgraph-frontend/src/features/experiments/reproducibility-model.ts`, `provenance-report.ts`, `components/tabs/ReproductionTab.tsx`; backend classification in `synthgraph-backend/src/reproduction/services/get-reproduction-manifest.service.ts`.
- **Actual behaviour:** the backend classifies fields as known, supplied, missing or external. The frontend then computes the percentage (external fields count half), assigns grades at 85% and 60%, derives blockers (uncommitted code, no seed, no code version), and caps the grade.
- **Confirmed contradiction:** the backend lists "Code version" as missing unless `code_version` is set, even when the SDK recorded `environment.commit`; the frontend deletes that entry from the backend's list. Two layers define the code version differently.
- **Scoring detail:** every environment key counts as a recorded field, including `dirty: true`, so the percentage partly measures how many keys the SDK sent.
- **Mitigations already present:** a dirty working tree caps the grade at "partial"; the screen shows the blockers beside the score; the copy says it "checks what was captured, not that the data or code still exist".
- **Naming problem:** the grade labels say "Reproducible", which describes more than the score measures (metadata completeness).
- **Expected behaviour:** the backend defines the required fields, the completeness calculation, the thresholds and the blockers, and returns them with a method version; the frontend renders them.
- **Acceptance criteria:** no frontend scoring formula; no frontend override of a backend classification; commit presence and dirty working tree kept as separate conditions; backend tests for known, supplied, external and missing fields.
- **Potential user impact:** a researcher cites a completeness score as reproducibility evidence, or two clients disagree. Likelihood medium; consequence moderate to high for a provenance product.
- **Observed user impact:** none recorded.

### ARCH-004 - The frontend infers lineage edges from timing

- **Severity: High** (corrected from Critical after verification).
- **Where:** `synthgraph-frontend/src/features/experiments/lineage-model.ts` (the block that builds edges with `inferred = true`), `shared/lineage/LineageGraph.tsx`.
- **Rule broken:** `docs/frontendarchitecture.md:296` forbids inferring lineage from timestamps.
- **Actual behaviour:** when a generation has no recorded link, the frontend draws a dashed edge to any dataset that runs recorded but no generation claims (or, failing that, to every run that began after the generation finished), based on timestamps. It does not choose between candidates: every plausible generation gets an edge.
- **Mitigations present, and why High rather than Critical:** the edges are dashed, the graph states how many generations have no recorded link, a legend explains them, and the blast-radius panel says "Includes inferred links (dashed), not recorded provenance".
- **Root cause:** the data model records generation-to-dataset and run-to-dataset links but **no generation-to-run link**, so most existing data has gaps (in the Phase 1 experiment, 15 of 16 generations had no recorded link). Removing the inferred edges would leave those graphs largely disconnected.
- **Decision needed:** either remove inferred edges, or amend the rule to allow clearly labelled guesses while a recorded relationship is added.
- **Potential user impact:** after a bad dataset is found, a researcher asks which models it affected and receives partly guessed answers. Likelihood medium.
- **Observed user impact:** none recorded.

### ARCH-005 - Domain-assessment rules live in the frontend

Split from the original entry. Only the items below are domain decisions; the acceptable items are in section 5.

- **Overview "Needs attention":** `OverviewTab.tsx` defines what flags a run - failed status, partial or unknown capture, or any drift. These checks are objective and the screen is built to avoid judging performance, but the rule set is defined in the frontend. The empty state reads "Nothing needs attention", which reads as broader than the three checks.
- **Reports:** `features/reports/efficiency-model.ts` computes the Pareto frontier and value per hour; `capture-model.ts` applies a 50% "majority" rule to decide when a missing integration is worth flagging. Best Runs picks a winner from the backend's max and min using the ARCH-001 direction.
- **Consistency check performed:** Overview and the Capture Completeness page both treat partial and unknown capture as needing attention; Overview adds failed runs and drift on purpose. No disagreement was found.
- **Remediation direction:** decide per rule whether it is a domain decision (move to the backend) or a view-specific aggregation (keep).
- **Potential user impact:** a run that diverged still shows "Nothing needs attention", because divergence is not one of the checks. Likelihood medium; consequence low-moderate (false reassurance).
- **Observed user impact:** none recorded.

### ARCH-006 - Evaluation comparison semantics are inferred in the frontend

- **Where:** `synthgraph-frontend/src/features/experiments/outcomes.ts`, `components/tabs/RunComparisonPanel.tsx`, `shared/charts/metric-series.ts`.
- **Actual behaviour:** the checkpoint step is read from the evaluation name with a pattern (`step[-_ ]?(\d+)`); there is no checkpoint field in the SDK or the evaluation record (only free-form metadata). When a metric's direction is unknown, "best" resolves to the maximum.
- **Where the assumption is disclosed and where it is not:** the Efficiency Leaderboard states "No direction could be inferred ... higher is assumed" and offers an override; Best Runs shows high and low neutrally and picks no winner; the run comparison printed "best <value>" per run regardless of direction.
- **Remediation direction:** structured checkpoint step and explicit direction from the API (shares a decision with ARCH-001); existing evaluations would still need the name fallback.
- **Potential user impact:** a lower-is-better metric without an inferable direction shows its worst checkpoint as "best". Likelihood low-medium.
- **Observed user impact:** none recorded.

### ARCH-007 - Competing report-generation authority

- **Status: rejected - not supported by the evidence.**
- **Claim:** the frontend's downloadable provenance report and a backend report could give conflicting reproducibility assessments.
- **Evidence:** the backend documentation export (`synthgraph-backend/src/documentation/services/get-documentation.service.ts`) contains no score, grade or classification; it prints the generation's raw reproducibility JSON, parameters and dataset references. Only the frontend report makes an assessment, so there is nothing for it to contradict.
- **What remains true and is tracked under ARCH-003:** the frontend report's grades are computed in the browser and exist nowhere else.

## 4. Findings removed from the confirmed list

### Null-seed conflict (previously reported under ARCH-003)

- **Claim:** the backend counts a null seed as recorded while the frontend counts it as missing.
- **Why it is currently unreachable:**
  - The backend validation (`generations/dto/generation-request.dto.ts`, the `reproducibility.seed` check) rejects any seed that is present but not a safe integer, so a null seed returns 400.
  - The SDK serialises with `exclude_none=True` (`sdk/src/synthgraph/generations.py`), so it never sends a null.
- **Residual risk:** a row written outside the API (manual SQL, an old import) could hold a null seed, where the two layers would disagree. Low; recorded so the check can be aligned when the assessment moves to the backend.

## 5. Acceptable presentation behaviour (not violations)

These are documented boundaries, not backlog items.

| Behaviour | Why it is acceptable |
| --- | --- |
| Counting rising, falling and flat metrics | Aggregation of backend results. (The "improving / worsening" counts are not covered: they depend on ARCH-001.) |
| Result panel mean, minimum and maximum across evaluations | A view-level aggregation, not an assessment. |
| Provenance presence ticks (generation, dataset, training, evaluation, environment) | Presence checks over loaded records; the environment tick reads the backend's classification. |
| Chart smoothing (exponential moving average), normalisation, log scale, series toggling | Presentation transformations and interaction state. |
| Local filtering, sorting, formatting of values and labels | View-level logic. |
| Polling a running training run every five seconds | Data-fetching responsibility. |

## 6. Investigating

### INV-001 - Backend health-trend quality

The backend's trend is a straight-line fit over the last 5 steps with a 1% "flat" threshold. For noisy metrics this can flip between increasing and decreasing between reads, and "flat" means "under 1% change over the window", which is easy to misread. This is an assessment-quality question, not a layer violation. Covered by end-to-end tests only; the pure calculation was extracted to a function that can be unit-tested.

## 7. Cross-cutting risks

| ID | Risk | Related |
| --- | --- | --- |
| RISK-001 | Different clients can produce different domain conclusions. | ARCH-001, 002, 003, 005 |
| RISK-002 | Misleading provenance. | ARCH-004 |
| RISK-003 | Statistical results presented without a documented method. | ARCH-002 |
| RISK-004 | Frontend and backend classifications can contradict each other. | ARCH-003 |
| RISK-005 | Naming conventions become hidden dependencies. | ARCH-001, 006 |
| RISK-006 | A change to a domain rule means changing several UI components. | ARCH-001, 002, 003, 005, 006 |

## 8. Remediation order

1. ARCH-003 - backend defines the assessment (needs no new data).
2. ARCH-001 and ARCH-006 together - explicit direction and checkpoint step (needs an owner decision on where they are declared).
3. ARCH-004 - needs an owner decision, then a recorded generation-to-run relationship.
4. ARCH-002 and ARCH-005 - after the exploratory-versus-authoritative decision.

## 9. Resolution history

| Date | Change | Effect |
| --- | --- | --- |
| 2026-10-30 | Registry created from the verification review. | ARCH-007 rejected; null-seed conflict removed with its reasoning; ARCH-004 severity set to High; ARCH-005 split; potential and observed impact recorded separately. |
