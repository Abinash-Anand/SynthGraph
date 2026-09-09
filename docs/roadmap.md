# SynthGraph Roadmap

## Milestone 1: Backend Foundation
- module structure
- application configuration
- TypeORM
- migration workflow
- testing foundation

## Milestone 2: Identity and Authentication
- user persistence
- API-key persistence
- API-key authentication
- authorization boundary
- auth/isolation tests

## Milestone 3: Project -> Experiment
- Project database model
- Project repository
- Project creation
- Project retrieval/list
- Experiment database model
- Experiment CRUD
- SDK -> API -> PostgreSQL integration

Status: completed.

## Milestone 4: Generation Provenance
- #18 Generation persistence
- #19 Generation creation
- #20 Generation retrieval/list
- #21 Generation lifecycle
- #22 Provenance immutability
- #23 SDK integration

Current focus: #18 + #19.

## Milestone 5: Dataset and Asset
- Dataset/DatasetVersion
- GenerationDatasetReference
- Asset/AssetVersion
- GenerationAssetReference
- integrity tests

## Milestone 6: Training, Evaluation, and Lineage
- TrainingRun
- TrainingRunDatasetReference
- EvaluationResult
- exact evaluation DatasetVersion
- lineage queries
- end-to-end lineage tests

## Milestone 7: Search, Comparison, and Reproduction
- search
- parameter filtering
- comparison
- reproduction manifest
- documentation export

## Milestone 8: Production Hardening
- API error standardization
- idempotency
- pagination/filtering
- structured logs/redaction
- health/readiness
- backup/restore
- CI
- Render deployment
- deployed SDK integration

## Milestone 9: Pilot
- real workflow
- provenance completeness
- reproduction validation
- lineage validation
- integration issues and contract mismatches

## Development Cadence
Roadmap issues are implementation checkpoints, not mandatory separate coding sessions. Tightly coupled issues may be implemented together as one coherent feature slice. Full automated/integration/E2E validation happens at milestone boundaries, while obvious build or correctness problems are fixed during implementation.
