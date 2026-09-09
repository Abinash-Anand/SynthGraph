import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateEvaluationResults1788965054974
  implements MigrationInterface
{
  name = 'CreateEvaluationResults1788965054974';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "evaluation_results" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "training_run_id" uuid NOT NULL,
        "dataset_version_id" uuid NOT NULL,
        "metrics" jsonb NOT NULL,
        "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_c621da2265b8bed07a44a5d5fa6" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_evaluation_results_training_run_id"
      ON "evaluation_results" ("training_run_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_evaluation_results_dataset_version_id"
      ON "evaluation_results" ("dataset_version_id")
    `);

    await queryRunner.query(`
      ALTER TABLE "evaluation_results"
      ADD CONSTRAINT "FK_1a2ea27b71f700e506da53228e2"
      FOREIGN KEY ("training_run_id")
      REFERENCES "training_runs"("id")
      ON DELETE RESTRICT
      ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "evaluation_results"
      ADD CONSTRAINT "FK_8f313b47dd9bf99d4c35cab8119"
      FOREIGN KEY ("dataset_version_id")
      REFERENCES "dataset_versions"("id")
      ON DELETE RESTRICT
      ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "evaluation_results"
      DROP CONSTRAINT "FK_8f313b47dd9bf99d4c35cab8119"
    `);

    await queryRunner.query(`
      ALTER TABLE "evaluation_results"
      DROP CONSTRAINT "FK_1a2ea27b71f700e506da53228e2"
    `);

    await queryRunner.query(`
      DROP INDEX "public"."IDX_evaluation_results_dataset_version_id"
    `);

    await queryRunner.query(`
      DROP INDEX "public"."IDX_evaluation_results_training_run_id"
    `);

    await queryRunner.query(`
      DROP TABLE "evaluation_results"
    `);
  }
}