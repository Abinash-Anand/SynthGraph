# SynthGraph Product

## Purpose
SynthGraph is a provenance and reproducibility platform for synthetic-data research, particularly computer-vision workflows.

Its core purpose is to make synthetic-data experiments reproducible, traceable, comparable, and useful for research analysis.

## Core Value
- Reproducibility: regenerate synthetic datasets with exact parameters, assets, versions, and seeds.
- Lineage visibility: understand relationships between generation configurations and model performance.
- Compute optimization: identify useful synthetic configurations before generating more data.
- Failure diagnosis: trace poor results back to generation scenarios and inputs.
- Research documentation: produce paper-ready provenance and reproducibility material.

## Researcher Workflow
Researchers continue using their existing environments, generators, training frameworks, scripts, and notebooks. The Python SDK communicates with SynthGraph through HTTPS/JSON. SynthGraph should not require researchers to move their generator or training workflow into the platform.

## Data Ownership
Large datasets and assets remain under researcher control. SynthGraph stores metadata and references, not potentially hundreds-of-GB dataset bytes.

Typical stored information:
- URI/reference
- dataset or asset identity
- version
- hash
- provenance
- configuration
- metadata

## Platform Scope
SynthGraph is intended to be platform-independent and usable with synthetic-data workflows such as Unity, Blender, and other generation environments.

## MVP Boundary
The MVP concentrates on:
- projects
- experiments
- generations
- datasets and dataset versions
- assets and asset versions
- training runs
- evaluation results
- lineage
- search/filtering
- reproduction manifests
- documentation export

Intelligent recommendations, optimization, and higher-level automated insights are future scope rather than assumptions for the current MVP.

## Privacy and Compliance
The product is intended for the German/EU environment and is designed with GDPR compliance in mind.
