# SynthGraph architecture violation registry

Purpose: a traceable record of places where the implementation departs from SynthGraph's architecture, what each costs the people using it, and what has been done about it. Every entry was checked against the repository, not just reported.

- **Verified against:** `main` at commit `6d6916b`, 2026-10-30. Remediation entries were verified on the branch that carries commits `0b3becc` to `8cf3793`: 208 frontend tests, 39 backend unit tests, 244 end-to-end tests against a local database, a production build, `tsc` and lint.
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
| ARCH-001 | Metric optimisation direction is guessed from names in the frontend | Critical (see note) | partially remediated |
| ARCH-002 | Parameter-analysis conclusions are computed in the frontend | High | decided: exploratory; labelled |
| ARCH-003 | Reproducibility scoring and grading live in the frontend | Critical (see note) | partially remediated |
| ARCH-004 | The frontend infers lineage edges from timing | **High** | confirmed |
| ARCH-005 | Domain-assessment rules (attention flags, report analytics) live in the frontend | Low-Medium | confirmed (split from the original entry; wording corrected) |
| ARCH-006 | Evaluation comparison semantics are inferred in the frontend | Medium | partially remediated |
| ARCH-007 | Competing report-generation authority | - | **rejected** |
| INV-001 | Backend health-trend quality (5-step window, 1% threshold) | - | investigating |

Severity note for ARCH-001 and ARCH-003: the verification review rated both High rather than Critical, because their user-facing signals are labelled as inferred or partial. The registry keeps the severity first recorded until the owner decides.

## 2a. Owner decisions (2026-10-30)

| Question | Decision | Consequence |
| --- | --- | --- |
| Where is a metric's optimisation direction declared? (ARCH-001, ARCH-006) | An optional field supplied when the metric is logged, SDK to API. Unknown stays neutral. | New optional field in the SDK, API and database; the frontend then reads it and the name-based inference is removed. |
| What happens to guessed lineage edges? (ARCH-004) | Remove them, and add the recorded link first. | A recorded generation-to-run relationship is added before any edge is removed, so existing graphs are not left disconnected without a replacement. |
| Is the Parameters analysis official or exploratory? (ARCH-002) | Exploratory. | Stays in the frontend, labelled as exploratory. |
| Should Overview flag runs that never reported capture? (ARCH-005) | Yes, as the Capture Completeness report does. | Done: Overview and the report now agree. |

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
- **Remediation direction:** an explicit, optional direction field. **Decided 2026-10-30:** it is supplied when the metric is logged (SDK to API), optional, and unknown stays neutral; the name-based inference is removed once the field is read. Not started.
- **Remediated so far (temporary compatibility only, 2026-10-30):** the singular and plural forms of collision, failure, violation, fall and crash are now recognised, and spread metrics (`std`, `stddev`, `stdev`, `var`, `variance`, `sigma`, `stderr`, `spread`) have no direction. The file now states that its inference is temporary. **Still open:** every guess is still made in the frontend, there is still no declared direction, and metrics outside the lists still have none. This changes the direction parameter analysis receives for those metrics; the analysis code itself was not touched.
- **Acceptance criteria:** no keyword-based direction inference in the frontend; unknown direction never produces an improvement verdict; backend tests cover all four directions; data without a direction is handled safely.
- **Potential user impact:** a researcher stops or keeps a run, or reads a comparison, on a wrong colour. Likelihood medium; consequence moderate (wasted compute, misread runs); no data is corrupted.
- **Observed user impact:** none recorded. The owner could not tell what the colours meant when reviewing the screen (2026-10-30), which is a usability finding, not an incorrect result.

### ARCH-002 - Parameter-analysis conclusions are computed in the frontend

- **Where:** `synthgraph-frontend/src/features/experiments/parameter-model.ts`, `components/tabs/ParameterInsights.tsx`.
- **Actual behaviour:** the frontend computes Spearman rank correlation, eta-squared ("% of variation"), a parameter role from keyword lists, a seed noise floor and a reliability grade, and picks each run's outcome as its best evaluation. The backend supplies grouped averages and which parameters vary.
- **Guardrails present:** it refuses to rank below 5 runs, grades reliability (8 or more runs for "ok"), calls results association not cause, and treats seed-only variation as noise.
- **Open question (blocks classification):** is this an authoritative SynthGraph insight or an exploratory view? The outcome metric is chosen in the UI, and the screen leads with "What moved the outcome", which argues each way.
- **Remediation direction:** decide first. If authoritative, move the methodology to a backend service with a documented, versioned method; if exploratory, label it as such and keep it in the frontend.
- **Decided 2026-10-30: exploratory.** The section is now headed "What moved the outcome" with an "Exploratory" badge and an introduction that says it is an exploratory view, not an official SynthGraph result, that it is worked out in the browser for the outcome metric the viewer picks, and that it shows association, not cause. A test guards the framing. The analysis itself is unchanged. If it is ever promoted to an official insight, it needs a documented, versioned backend method first.
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
- **Remediated so far (2026-10-30):**
  - The backend now classifies a non-blank `environment.commit` as a known "Code version" (`classificationVersion: 2`, additive), and the frontend override is removed. Commit presence (backend classification) and a dirty working tree (`environment.dirty`) are separate conditions with separate blockers. Scores for existing generations are unchanged.
  - The grades are renamed for what they measure (Well recorded, Some gaps, Major gaps, Not assessed; key `complete` replaces `reproducible`) and the assessment is versioned (`ASSESSMENT_VERSION` 2, thresholds exposed as `ASSESSMENT_METHOD`, stated in the Markdown report and carried in the JSON download).
  - **Still open:** the score, the thresholds and the blockers (including reading `environment.dirty`) are still computed in the frontend; the seed rule is still checked in two places; the report is still built in the browser.
  - **Deploy order:** backend first. A frontend that reads the classification as is shows a recorded commit as "no code version" against a backend that has not been updated.
- **Potential user impact:** a researcher cites a completeness score as reproducibility evidence, or two clients disagree. Likelihood medium; consequence moderate to high for a provenance product.
- **Observed user impact:** none recorded.

### ARCH-004 - The frontend infers lineage edges from timing

- **Severity: High** (corrected from Critical after verification).
- **Where:** `synthgraph-frontend/src/features/experiments/lineage-model.ts` (the block that builds edges with `inferred = true`), `shared/lineage/LineageGraph.tsx`.
- **Rule broken:** `docs/frontendarchitecture.md:296` forbids inferring lineage from timestamps.
- **Actual behaviour:** when a generation has no recorded link, the frontend draws a dashed edge to any dataset that runs recorded but no generation claims (or, failing that, to every run that began after the generation finished), based on timestamps. It does not choose between candidates: every plausible generation gets an edge.
- **Mitigations present, and why High rather than Critical:** the edges are dashed, the graph states how many generations have no recorded link, a legend explains them, and the blast-radius panel says "Includes inferred links (dashed), not recorded provenance".
- **Root cause:** the data model records generation-to-dataset and run-to-dataset links but **no generation-to-run link**, so most existing data has gaps (in the Phase 1 experiment, 15 of 16 generations had no recorded link). Removing the inferred edges would leave those graphs largely disconnected.
- **Decided 2026-10-30:** remove the inferred edges, and add the recorded generation-to-run link first. Nothing on screen changes until the recorded link exists, so existing graphs are not left disconnected without a replacement. Not started.
- **Potential user impact:** after a bad dataset is found, a researcher asks which models it affected and receives partly guessed answers. Likelihood medium.
- **Observed user impact:** none recorded.

### ARCH-005 - Domain-assessment rules live in the frontend

Split from the original entry. Only the items below are domain decisions; the acceptable items are in section 5.

- **Overview "Needs attention":** `OverviewTab.tsx` defines what flags a run - failed status, partial or unknown capture, or any drift. These checks are objective and the screen is built to avoid judging performance, but the rule set is defined in the frontend. The empty state reads "Nothing needs attention", which reads as broader than the three checks.
- **Reports:** `features/reports/efficiency-model.ts` computes the Pareto frontier and value per hour; `capture-model.ts` applies a 50% "majority" rule to decide when a missing integration is worth flagging. Best Runs picks a winner from the backend's max and min using the ARCH-001 direction.
- **Consistency (corrected 2026-10-30, resolved the same day):** Overview and the Capture Completeness page disagreed for runs that never reported capture. Such a run has `captureStatus: null`; the report counts it as "unknown" (the backend buckets null as unknown) while the Overview rule flagged only an explicit `"unknown"`. Decided to flag them: Overview now flags a run with a null `captureStatus` as "capture not reported", and a test checks that the runs flagged for capture are exactly the runs the report counts as partial or unknown. Overview still adds failed runs and drift on purpose. A run that is still running and has not reported capture is flagged too, as the report counts it; until a run reports capture its status is unknown.
- **Remediation direction:** decide per rule whether it is a domain decision (move to the backend) or a view-specific aggregation (keep).
- **Remediated so far (wording only, 2026-10-30):** the empty state no longer says "Nothing needs attention". It lists the checks actually run (failed runs, capture reported as partial or unknown, capture never reported, drift from earlier completed runs), says that metric behaviour is not checked, and is generated from the same list as the rules. The panel heading is "Flagged runs". The rules themselves are unchanged and still live in the frontend.
- **Potential user impact:** a run that diverged still shows "Nothing needs attention", because divergence is not one of the checks. Likelihood medium; consequence low-moderate (false reassurance).
- **Observed user impact:** none recorded.

### ARCH-006 - Evaluation comparison semantics are inferred in the frontend

- **Where:** `synthgraph-frontend/src/features/experiments/outcomes.ts`, `components/tabs/RunComparisonPanel.tsx`, `shared/charts/metric-series.ts`.
- **Actual behaviour:** the checkpoint step is read from the evaluation name with a pattern (`step[-_ ]?(\d+)`); there is no checkpoint field in the SDK or the evaluation record (only free-form metadata). When a metric's direction is unknown, "best" resolves to the maximum.
- **Where the assumption is disclosed and where it is not:** the Efficiency Leaderboard states "No direction could be inferred ... higher is assumed" and offers an override; Best Runs shows high and low neutrally and picks no winner; the run comparison printed "best <value>" per run regardless of direction.
- **Remediation direction:** structured checkpoint step and explicit direction from the API (shares a decision with ARCH-001); existing evaluations would still need the name fallback.
- **Remediated so far (2026-10-30):** the run comparison no longer calls the maximum "best" when a metric has no known direction. It shows the highest and lowest values instead, in the checkpoint summary and in the training-curves table; a known direction still shows "best". **Still open:** the checkpoint step is still parsed from the evaluation name, the Efficiency Leaderboard still assumes "higher" when the direction is unknown (disclosed on screen, with an override), and parameter analysis still resolves an unknown direction to the maximum.
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
| 2026-10-30 | Registry created from the verification review (`0b3becc`). | ARCH-007 rejected; null-seed conflict removed with its reasoning; ARCH-004 severity set to High; ARCH-005 split; potential and observed impact recorded separately. |
| 2026-10-30 | Metric keyword gaps and spread metrics (`1a20bd5`). | ARCH-001 partially remediated (temporary compatibility fix, regression tests). |
| 2026-10-30 | Run comparison no longer labels the maximum "best" for an unknown direction (`6cfd328`). | ARCH-006 partially remediated. |
| 2026-10-30 | Backend recognises `environment.commit` (`c90db29`) and the frontend override is removed (`60bd2ee`). | ARCH-003: the code-version contradiction is gone; classification version 2 introduced; scores unchanged. |
| 2026-10-30 | Grades renamed and the assessment versioned (`a73fb49`). | ARCH-003 partially remediated; assessment version 2 (same scoring, new names, code version from the backend). |
| 2026-10-30 | Attention wording (`8cf3793`). | ARCH-005: wording describes the checks performed; the Overview versus Capture Completeness difference for never-reported capture recorded; behaviour unchanged. |
| 2026-10-30 | Owner decisions recorded (section 2a); Overview flags never-reported capture; the Parameters analysis is labelled exploratory. | ARCH-005 consistency resolved; ARCH-002 decided and labelled. |
