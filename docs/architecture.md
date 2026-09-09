# SynthGraph Architecture

## System Shape
SynthGraph currently uses a modular monolith. The backend is one NestJS application with clear feature/module boundaries. Distributed services are not justified by the current scale or requirements.

## Technology
Backend:
- NestJS
- TypeScript
- REST
- JSON
- TypeORM
- PostgreSQL

Authentication:
- API keys for SDK access

API documentation:
- OpenAPI/Swagger

Testing:
- Vitest
- Supertest

## Request Flow
SDK -> HTTPS/JSON -> NestJS controller -> application service/use case -> repository -> TypeORM -> PostgreSQL

Controllers handle HTTP concerns. Application services contain use-case behavior. Repositories isolate persistence operations.

## Database
PostgreSQL is the relational source of truth. Core lineage relationships use relational foreign keys and junction tables. JSONB is used for flexible provenance/configuration where structure varies between research workflows.

The application uses TypeORM migrations. `synchronize` remains disabled.

## Authentication
SDK requests use API-key authentication. Raw API keys are not persisted. The backend stores a hash and uses it to authenticate requests.

Authentication establishes user identity. Authorization is enforced at resource boundaries.

## Authorization
Ownership follows:
User -> Project -> Experiment -> Generation / TrainingRun

An ID alone never proves authorization. Queries and use cases must verify that the resource belongs to the authenticated user's ownership chain.

## Deployment
Development:
- local PostgreSQL 18
- database `synthgraph_dev`
- `localhost:5432`

Production:
- Render hosts the backend
- Supabase provides PostgreSQL

Both environments use the same application configuration interface through `DATABASE_URL`.

## Storage Strategy
SynthGraph does not initially store large dataset or asset bytes. Researchers retain control of the underlying data. SynthGraph records references, versions, hashes, provenance, and metadata.

## Deliberately Avoided Infrastructure
The current architecture does not require:
- microservices
- Kafka/event buses
- Kubernetes
- CQRS
- event sourcing
- graph databases
- object storage as an MVP requirement

These should only be reconsidered when concrete workload or product requirements justify them.
