import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Two indexes, matching the two distinct query shapes
 * TypeOrmTrainingRunRepository.findByCaptureStatus() actually issues -
 * not one index for "the capture_status column" in the abstract, since
 * jsonb equality and IS NULL don't share a useful index the same way.
 *
 * - `complete`/`partial` query `capture_status ->> 'status' = :value`
 *   (always scoped by experiment_id first) - a composite expression index
 *   matches that exactly.
 * - `unknown` queries `capture_status IS NULL` directly, not a derived
 *   expression - a partial index on the sentinel rows matches that
 *   exactly, without loosening the NULL-is-the-sentinel semantics
 *   (entity comment on TrainingRun.captureStatus, CONTRACT.md 2.27) by
 *   substituting an expression-based proxy for it.
 */
export class AddCaptureStatusIndexesToTrainingRuns1788995000000
  implements MigrationInterface
{
  name = 'AddCaptureStatusIndexesToTrainingRuns1788995000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE INDEX "IDX_training_runs_experiment_capture_status"
      ON "training_runs" ("experiment_id", ("capture_status" ->> 'status'))
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_training_runs_experiment_capture_status_unknown"
      ON "training_runs" ("experiment_id")
      WHERE "capture_status" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX "IDX_training_runs_experiment_capture_status_unknown"
    `);

    await queryRunner.query(`
      DROP INDEX "IDX_training_runs_experiment_capture_status"
    `);
  }
}
