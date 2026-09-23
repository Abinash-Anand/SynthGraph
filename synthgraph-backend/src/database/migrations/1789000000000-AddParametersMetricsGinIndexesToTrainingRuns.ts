import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * ReportsRepository.findTrainingRunsByNumericFilter() filters an arbitrary,
 * caller-supplied JSONB key (a hyperparameter or metric name that varies per
 * training run - there's no fixed column to index) with a regex + numeric
 * cast: `(column ->> :filterKey) ~ '^-?[0-9]+(\.[0-9]+)?$'`. That predicate
 * can't be indexed directly - Postgres has no way to pre-compute "which rows
 * match this regex for this specific runtime key" without evaluating it.
 *
 * What CAN be indexed is the cheap, always-true-or-false part the query was
 * skipping: whether the row's `parameters`/`metrics` object even contains
 * that key at all (`column ? :filterKey`). A default (jsonb_ops) GIN index
 * supports the `?` containment operator, so adding that check up front lets
 * Postgres use the index to exclude every row lacking the key before ever
 * touching the regex/cast - turning a full per-row regex scan across a
 * user's entire training-run history into one scoped to the (usually much
 * smaller) subset of rows that have that key at all.
 */
export class AddParametersMetricsGinIndexesToTrainingRuns1789000000000
  implements MigrationInterface
{
  name = 'AddParametersMetricsGinIndexesToTrainingRuns1789000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE INDEX "IDX_training_runs_parameters_gin"
      ON "training_runs" USING GIN ("parameters")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_training_runs_metrics_gin"
      ON "training_runs" USING GIN ("metrics")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX "IDX_training_runs_metrics_gin"
    `);

    await queryRunner.query(`
      DROP INDEX "IDX_training_runs_parameters_gin"
    `);
  }
}
