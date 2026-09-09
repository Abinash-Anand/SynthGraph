# SynthGraph Current State

## Current Product Stage
SynthGraph is in backend MVP implementation and pilot preparation.

## Backend Stack
- NestJS
- TypeScript
- REST/JSON
- PostgreSQL
- TypeORM
- Vitest
- Supertest

## Authentication
API-key authentication is implemented. The backend hashes API keys and does not persist raw keys.

Authorization follows:
User -> Project -> Experiment -> child resources

## Implemented Domain
Currently implemented:
- User persistence
- API-key persistence/authentication
- Project creation/retrieval/list
- Experiment creation/retrieval/list

Current database tables:
- users
- projects
- api_keys
- experiments
- migrations

## Database Environments

### Development
Local PostgreSQL 18:
- host: `localhost`
- port: `5432`
- database: `synthgraph_dev`
- application user: `synthgraph_dev`

The local database has the current migrations applied.

### Production
Production backend is deployed on Render. Production PostgreSQL is Supabase. Production credentials are supplied through Render environment variables.

The local `.env` must not be committed.

## Deployment
Render successfully builds and starts the backend when `DATABASE_URL` is configured in the Render environment. Application configuration uses `DATABASE_URL`; environment-specific database URLs are not hardcoded.

## Testing
The current backend has automated E2E coverage for authentication, authorization/isolation, projects, experiments, and database integrity. The established workflow is to build coherent milestone slices and perform full validation at milestone boundaries.

## Current Milestone
Milestone 4: Generation Provenance.

Current work:
- #18 Generation persistence
- #19 Generation creation

Next:
- #20 Generation retrieval/list
- #21 Generation lifecycle
- #22 Provenance immutability
- #23 SDK integration

## Important Current Constraints
- Large dataset bytes are not stored by SynthGraph.
- Generation provenance must be reproducible.
- Generation configuration/provenance becomes immutable once the generation starts.
- A changed generation configuration creates a new Generation.
- No Comparison entity is required for the MVP.
- No graph database is required for the MVP.
- Do not introduce distributed infrastructure without a concrete requirement.

## Agent Guidance
Before implementing Generation, inspect:
1. actual SDK Generation models and API implementation
2. existing Experiment patterns
3. `docs/domain-model.md`
4. `docs/sdk-contract.md`

Do not assume Generation functionality already exists in the backend.
