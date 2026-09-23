# SynthGraph Engineering Decisions

## Modular Monolith
Decision: use a modular monolith initially.
Why: current scale and product stage do not justify distributed services.
Trade-off: future workloads may eventually require separation, but premature distribution adds operational and consistency complexity.

## PostgreSQL
Decision: PostgreSQL is the primary database.
Why: SynthGraph has strong relational lineage, ownership, versioning, and integrity requirements.

## TypeORM Migrations
Decision: schema changes are managed through TypeORM migrations.
Why: development and production schemas must be reproducible and controlled.
`synchronize` remains disabled.

## JSONB for Flexible Provenance
Decision: use PostgreSQL JSONB for genuinely flexible provenance/configuration.
Why: synthetic-data workflows vary significantly and new generator parameters should not require a migration for every parameter.
Do not create a database column for every possible generator parameter.

## External Large Data
Decision: do not store large research dataset or asset bytes in the SynthGraph MVP.
Why: researchers may work with datasets hundreds of GB or larger.
Store references, versions, hashes, and metadata.

## Ownership
Decision: authorization follows the domain hierarchy rather than duplicated ownership fields.
Hierarchy: User -> Project -> Experiment -> Generation / TrainingRun
Why: preserves clear domain structure and avoids inconsistent duplicated ownership state.

## API-Key Authentication
Decision: SDK authentication uses API keys.
Why: the SDK needs a simple non-interactive authentication mechanism.
Raw keys are not stored; only hashes are persisted.

## No Comparison Entity in MVP
Decision: do not create a dedicated Comparison entity initially.
Why: comparison can be derived from experiments, generations, training runs, and evaluation results.

## No Graph Database
Decision: represent lineage relationally.
Why: the current relationship graph is manageable with PostgreSQL foreign keys and junction tables.

## Local vs Production Database
Decision:
Development -> local PostgreSQL
Production -> Supabase PostgreSQL
Why: development must not mutate production data and should support safe migration/testing workflows.

## SDK Integration Strategy
SDK evolution is sequential:
- v1.0: manual/canonical payloads
- v1.1: integration helpers
- v1.2: automatic instrumentation

The backend should not assume automatic instrumentation exists in the current MVP.

## API Versioning
Decision: the API is unversioned (no `/v1` path prefix) for as long as every
change to it stays backward compatible.
Why: this project has no tagged releases yet and the CLI/SDK/frontend all
track the backend directly - a version prefix buys nothing until there's an
actual breaking change to isolate, and adding one now would just be a
routing-level rename with no real benefit.
Rule going forward: a change to an existing response shape, route, or field
meaning must be additive (new field alongside the old, new route alongside
the old) rather than replacing what's there - see how `NormalizedGeneration`
was added in `synthgraph-backend/src/generations/responses/generation.response.ts`
for the established pattern. The day a genuinely breaking change is
unavoidable, every existing route moves under `/v1` in the same PR that
introduces `/v2`, so old and new consumers can run against the same
deployment during a migration window - not before, and not partially.
