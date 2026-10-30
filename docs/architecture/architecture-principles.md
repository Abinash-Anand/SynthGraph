# SynthGraph architecture principles

These are the rules the code is expected to follow. Where the implementation departs from them, the departure is recorded in [architecture-violation-registry.md](architecture-violation-registry.md).

## The central rule

> The backend is authoritative for domain facts, domain interpretations, business rules and confirmed relationships. The frontend consumes these results and handles presentation, visualisation and interaction.

In practice: if a screen states a conclusion - a score, a grade, a verdict such as "improving", a warning, a relationship between two records - the backend produced it. The frontend decides how to show it, not whether it is true.

## Principles

| Principle | What it means here |
| --- | --- |
| Separation of concerns | The backend owns domain logic; the frontend owns presentation. |
| Backend domain authority | Interpretations and business rules are defined once, in the backend. |
| Single source of truth | A domain concept has one authoritative definition. If two layers define it, one of them is wrong. |
| Explicit domain semantics | Meaning is declared in the data, not guessed from names, ordering or timestamps. |
| API contract consistency | Every client (web app, CLI, SDK, a third party) gets the same domain result from the same record. |
| Additive API changes | Existing response shapes and routes do not change. New information is added alongside, with a version where its meaning could differ. |
| Honest labelling | A label says what was measured. "Well recorded" describes a share of recorded fields; "reproducible" would claim a result nobody verified. |

## The one rule that is written elsewhere

`docs/frontendarchitecture.md` states that the backend is authoritative for relationships and that the frontend must not infer lineage from names, timestamps, ordering, IDs or visual assumptions. The principles above generalise it.

## What the frontend may calculate

Not every calculation is domain logic. These stay in the frontend because they change how data looks, not what it means:

- Counting, summing and averaging backend results for display (for example, how many metrics are rising).
- Chart transformations: smoothing, normalisation, log scale, series toggling.
- Local filtering, sorting and formatting of values and labels.
- Interaction state and fetching strategy (for example, polling a running training run).

The test: *would a different client need to get the same answer to the same question?* If yes, it belongs in the backend.

## When a rule has to be provisional

Sometimes the data to do the right thing does not exist yet (for example, a declared metric direction). A temporary frontend heuristic is acceptable only if it:

1. says in the code that it is temporary and points at its registry entry,
2. says on screen that the result is inferred, and
3. stays neutral rather than guess when it cannot tell.

It is then recorded in the registry so it is removed when the data exists, not grown.

## Changing a domain rule

A change to how something is scored or classified must say which method version produced a result, so a stored or downloaded result can be read against the right rules, and must not silently change the meaning of results that already exist.
