# Security Policy

## Reporting a vulnerability

If you find a security vulnerability in SynthGraph, please **do not** open a
public GitHub issue.

Instead, email **contact@synthgraph.dev** with:

- A description of the vulnerability and its potential impact
- Steps to reproduce it (a minimal request/response, script, or repro repo
  helps a lot)
- The affected component (backend, frontend, SDK, or CLI) and, if known, the
  affected version/commit

We'll acknowledge your report and work with you on a fix and a disclosure
timeline before any public details are published.

## Supported versions

This project does not yet have tagged releases with a formal support
window - security fixes land on the default branch. Once versioned releases
begin, this section will be updated to state which versions receive
security patches.

## Scope

In scope:

- `synthgraph-backend` - the API server
- `synthgraph-frontend` - the dashboard and marketing site
- `sdk` - the Python SDK
- `synthgraph-sdk-cli` - the Python CLI

Out of scope: vulnerabilities that require physical access to a user's
machine, social engineering, or issues in third-party dependencies that are
already publicly disclosed (report those upstream instead, unless SynthGraph
is exposed to them in a way the upstream advisory doesn't cover).
