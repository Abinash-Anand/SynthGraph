# Contributing to SynthGraph

Thanks for your interest in contributing. This document covers how to get the
project running locally, how the repo is organized, and what to do before
opening a pull request.

## Repository layout

```
synthgraph-backend/    NestJS API (TypeScript, PostgreSQL via TypeORM)
synthgraph-frontend/   Next.js dashboard + marketing site (TypeScript)
sdk/                   Python SDK (synthgraph)
synthgraph-sdk-cli/    Python CLI built on the SDK
docs/                  Architecture and design notes
docker-compose.yml     Postgres + backend + frontend, for a one-command local stack
```

Each of the four project directories is independently versioned and has its
own dependency manifest (`package.json` or `pyproject.toml`) - there is no
top-level workspace, so install and run commands are per-directory.

## Prerequisites

- Node.js 22+ and npm 11+ (the backend's `package.json`/Dockerfile document why
  npm 11 specifically - npm 10 fails resolving this tree's TypeScript peer
  ranges)
- Python 3.11+
- Docker and Docker Compose, for the full local stack or for running the
  backend's e2e tests against a real Postgres instance
- PostgreSQL 16, if you'd rather run it outside Docker

## Quick start (full stack)

```bash
docker compose up --build
```

This starts Postgres, the backend on `:3000`, and the frontend on `:3001`.
`JWT_SECRET` defaults to a placeholder that is safe for local use, but the
backend refuses to start with it once `NODE_ENV=production` - see
`synthgraph-backend/src/config/configuration.ts`. The backend's
auto-generated API reference (OpenAPI/Swagger, from every controller and
DTO - see `nest-cli.json`'s `@nestjs/swagger` plugin) is at
`http://localhost:3000/docs`.

## Backend (`synthgraph-backend/`)

```bash
npm install
npm run migration:run     # apply migrations to your local Postgres
npm run start:dev         # watch mode, http://localhost:3000
```

Before opening a PR:

```bash
npm run lint
npm run build              # also typechecks
npm test                   # unit tests
npm run test:e2e           # e2e tests - needs a real Postgres; see below
```

**Running e2e tests**: the e2e suite talks to a real, migrated Postgres
database via `DATABASE_URL`. The straightforward way to get one locally:

```bash
docker run -d --name synthgraph-test-pg \
  -e POSTGRES_USER=synthgraph -e POSTGRES_PASSWORD=synthgraph \
  -e POSTGRES_DB=synthgraph -p 5433:5432 postgres:16-alpine

DATABASE_URL="postgresql://synthgraph:synthgraph@localhost:5433/synthgraph" \
JWT_SECRET="local-test-secret" \
npm run migration:run

DATABASE_URL="postgresql://synthgraph:synthgraph@localhost:5433/synthgraph" \
JWT_SECRET="local-test-secret" \
npm run test:e2e
```

This is exactly what CI does (`.github/workflows/ci.yml`), so if it passes
locally it will pass in CI.

**Migrations**: this project uses TypeORM migrations exclusively
(`synchronize: false` everywhere) - schema changes always go through
`npm run migration:generate` / a hand-written migration file, never through
entity auto-sync.

## Frontend (`synthgraph-frontend/`)

```bash
npm install
cp .env.example .env.local   # fill in what you need; see the file's own comments
npm run dev                  # http://localhost:3000
```

Before opening a PR:

```bash
npm run lint
npm run typecheck
npm run build
```

The frontend never calls the backend from the browser - all backend calls go
through Next.js Route Handlers / Server Components
(`SYNTHGRAPH_API_URL`, server-only). Keep that boundary when adding new
data-fetching code.

## SDK and CLI (`sdk/`, `synthgraph-sdk-cli/`)

```bash
cd sdk   # or synthgraph-sdk-cli
python -m venv .venv && source .venv/bin/activate   # or .venv\Scripts\activate on Windows
pip install -e ".[dev]"
pytest
ruff check .
mypy .
```

## Making changes

- Keep pull requests focused - one logical change per PR is easier to review
  and easier to revert if something's wrong.
- Add tests for new behavior. Backend changes should have e2e coverage for
  the actual HTTP contract, not just a unit test of the service in isolation.
- If you're changing a response shape or adding a field other consumers
  (the CLI, the SDK, the frontend) might read, prefer additive changes over
  breaking ones - see [`docs/engineering-decisions.md`](docs/engineering-decisions.md#api-versioning)
  for this project's API versioning policy, and how `NormalizedGeneration`
  was added in `synthgraph-backend/src/generations/responses/generation.response.ts`
  as a worked example of the pattern.
- Run the lint/build/test commands above before pushing - CI runs the same
  ones and will block the PR otherwise.

## Reporting bugs or requesting features

Open a GitHub issue. Include what you expected, what happened instead, and
enough detail to reproduce it (backend: request + response; frontend: steps
+ screenshot if relevant; SDK/CLI: a minimal script).

## Security issues

Do not open a public issue for a security vulnerability - see
[SECURITY.md](SECURITY.md).
