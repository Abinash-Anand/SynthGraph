import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCaptureStatusToTrainingRuns1788990000000
  implements MigrationInterface
{
  name = 'AddCaptureStatusToTrainingRuns1788990000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "training_runs"
      ADD COLUMN "capture_status" jsonb NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "training_runs"
      DROP COLUMN "capture_status"
    `);
  }
}
