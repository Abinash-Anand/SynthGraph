# SynthGraph Domain Model

## Canonical Hierarchy
User -> Project -> Experiment -> Generation / TrainingRun -> EvaluationResult

Important relationships:
- User 1:N Project
- Project 1:N Experiment
- Experiment 1:N Generation
- Experiment 1:N TrainingRun
- TrainingRun 1:N EvaluationResult
- Dataset 1:N DatasetVersion
- Asset 1:N AssetVersion
- Generation N:M DatasetVersion through GenerationDatasetReference
- Generation N:M AssetVersion through GenerationAssetReference
- TrainingRun N:M DatasetVersion through TrainingRunDatasetReference
- EvaluationResult N:1 DatasetVersion for the exact evaluation dataset

## Initial Relational Tables
1. users
2. projects
3. experiments
4. generations
5. datasets
6. dataset_versions
7. generation_dataset_refs
8. assets
9. asset_versions
10. generation_asset_refs
11. training_runs
12. training_run_dataset_refs
13. evaluation_results

There is no separate Comparison entity in the MVP.

## Generation
A Generation represents one concrete synthetic-data generation attempt/configuration within an Experiment.

Generation lifecycle:
pending -> running -> completed
                    -> failed

Failed generations remain stored because failure is itself provenance.

## Generation Immutability
Generation provenance/configuration is frozen once the generation starts running. If the configuration changes, create a new Generation rather than mutating the existing provenance.

## Provenance
Generation provenance may include:
- generator identity
- generator version
- parameters
- random seed
- asset references
- code/version information
- environment information
- dataset references

The exact current wire shape must follow the SDK contract and actual implementation.

## Datasets and Assets
SynthGraph stores references and metadata rather than large underlying bytes. A dataset or asset may have multiple versions. Version identity is important for reproducibility.

## Lineage
Lineage is represented through relational relationships and junction tables. A graph database is not required for the MVP.

## Authorization
Ownership is inherited through:
Generation -> Experiment -> Project -> User

A Generation does not need to duplicate `user_id` merely for authorization. IDs do not imply authorization.
