# SynthGraph

SynthGraph is a platform for tracking, understanding, and reproducing
synthetic-data research experiments: a Python SDK that captures what a
generation or training run actually did (parameters, seeds, environment,
dataset lineage), a backend that stores and reports on that provenance, and
a dashboard for exploring it.

## Repository structure

- [`synthgraph-backend/`](synthgraph-backend) - NestJS API (TypeScript, PostgreSQL via TypeORM)
- [`synthgraph-frontend/`](synthgraph-frontend) - Next.js dashboard and marketing site
- [`sdk/`](sdk) - Python SDK
- [`synthgraph-sdk-cli/`](synthgraph-sdk-cli) - Python CLI built on the SDK
- [`docs/`](docs) - Architecture and design notes
- `docker-compose.yml` - Postgres + backend + frontend, for a one-command local stack

## Quick start

```bash
docker compose up --build
```

This starts Postgres, the backend at `http://localhost:3000`, and the
frontend at `http://localhost:3001`. The backend's auto-generated API
reference is at `http://localhost:3000/docs`.

For running each piece individually, or the test suites, see
[CONTRIBUTING.md](CONTRIBUTING.md).

## Contributing

Contributions are welcome - see [CONTRIBUTING.md](CONTRIBUTING.md) for local
setup, testing, and PR conventions.

## Security

Found a vulnerability? Please see [SECURITY.md](SECURITY.md) rather than
opening a public issue.

## License

[MIT](LICENSE)
