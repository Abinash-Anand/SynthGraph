# SynthGraph

[![CI](https://github.com/Abinash-Anand/SynthGraph/actions/workflows/ci.yml/badge.svg)](https://github.com/Abinash-Anand/SynthGraph/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**A data lineage system for synthetic training data.**

SynthGraph connects the parts of a synthetic-data pipeline that most tooling never links together: which generator produced a dataset, with which seed and parameters, which training run consumed that dataset, and which evaluation scored the result. When a model misbehaves, you trace it back through that chain instead of guessing.

## Why

Weights & Biases and MLflow track training runs and metrics well. Neither has a concept of what happened *before* the dataset — the procedural generator, the domain-randomization bounds, the seed that produced the data a model trained on. For synthetic-data and simulation-to-real pipelines (robotics, 3D computer vision, procedural generation), that upstream step is often exactly where a sim-to-real failure originates, and it's the gap SynthGraph fills.

## What it does

- **Lineage graph** — generation → dataset version → training run → evaluation, as one connected, queryable graph instead of scattered logs.
- **Generation comparison** — diff two generations' parameters side by side to see exactly what changed between a working run and a broken one.
- **Reproduction manifest** — records the git commit, working-tree dirty state, and environment (OS, Python version, installed packages) a generation ran under.
- **Reports** — capture-completeness, parameter/metric correlation, best-runs leaderboard, and drift detection across training runs.

## What it deliberately doesn't do (yet)

- **No engine integration.** The SDK doesn't hook into Blender, MuJoCo, Isaac Sim, or any other engine — it's a thin client. Your script calls `log_generation(generator=..., parameters={...})` with whatever it wants; SynthGraph never reaches into a running process.
- **No fixed parameter schema.** `parameters` is a free-form JSON object today, not typed fields for things like camera distortion or physics variables.
- **No data storage.** SynthGraph never touches dataset bytes, render frames, or model weights. It stores lightweight metadata, caller-supplied checksums, and URIs — where those URIs point (S3, R2, a local disk) is entirely up to you.

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
