# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
This project does not yet have tagged releases - entries accumulate under
`Unreleased` until the first version is cut.

## [Unreleased]

### Added
- MIT license
- CI (GitHub Actions): backend lint/build/unit/e2e and frontend
  lint/typecheck/build on every PR
- Per-IP rate limiting, tightened on `/auth/login` and `/auth/register`
- Pagination (`limit`/`offset`) on every previously-unbounded list endpoint
- `POST /training-runs/:id/metrics/batch` for logging many training steps
  in one request
- PATCH (rename) and DELETE (archive) routes for Project, Experiment,
  Dataset, and Asset
- A consistent, additive `normalized` shape on every Generation-returning
  response
- `CONTRIBUTING.md`, `SECURITY.md`, issue/PR templates

### Fixed
- CORS now requires an explicit origin allowlist in production, instead of
  reflecting any origin
- JWT_SECRET is now rejected at startup in production if unset or left at
  its insecure default
- Referencing the same dataset version from a generation under a second
  role no longer incorrectly conflicts
- An unindexed JSONB regex scan on the training-run numeric-filter search
  is now backed by GIN indexes
