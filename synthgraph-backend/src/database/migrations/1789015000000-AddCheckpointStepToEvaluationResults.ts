import { MigrationInterface, QueryRunner } from 'typeorm';

// The training step an evaluation was taken at, recorded by whoever ran it.
//
// Additive and without a backfill: the column is nullable with no default, so
// every existing evaluation keeps NULL, which means "no checkpoint step was
// recorded". Nothing is parsed out of evaluation names.
//
// Rollback (down) drops the column. The only data lost is the recorded
// checkpoint steps themselves; the evaluations and their metrics are untouched.
export class AddCheckpointStepToEvaluationResults1789015000000
  implements MigrationInterface
{
  name = 'AddCheckpointStepToEvaluationResults1789015000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "evaluation_results"
      ADD COLUMN "checkpoint_step" integer
    `);

    await queryRunner.query(`
      ALTER TABLE "evaluation_results"
      ADD CONSTRAINT "CHK_evaluation_results_checkpoint_step_non_negative"
      CHECK ("checkpoint_step" IS NULL OR "checkpoint_step" >= 0)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "evaluation_results"
      DROP CONSTRAINT "CHK_evaluation_results_checkpoint_step_non_negative"
    `);

    await queryRunner.query(`
      ALTER TABLE "evaluation_results"
      DROP COLUMN "checkpoint_step"
    `);
  }
}
