import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTrainingRunMetrics1788980000000
  implements MigrationInterface
{
  name = 'CreateTrainingRunMetrics1788980000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "training_run_metrics" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "training_run_id" uuid NOT NULL,
        "step" integer NOT NULL,
        "metrics" jsonb NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_training_run_metrics_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_training_run_metrics_training_run_id"
      ON "training_run_metrics" ("training_run_id")
    `);

    await queryRunner.query(`
      ALTER TABLE "training_run_metrics"
      ADD CONSTRAINT "FK_training_run_metrics_training_run_id"
      FOREIGN KEY ("training_run_id")
      REFERENCES "training_runs"("id")
      ON DELETE RESTRICT
      ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "training_run_metrics"
      DROP CONSTRAINT "FK_training_run_metrics_training_run_id"
    `);

    await queryRunner.query(`
      DROP INDEX "public"."IDX_training_run_metrics_training_run_id"
    `);

    await queryRunner.query(`
      DROP TABLE "training_run_metrics"
    `);
  }
}
