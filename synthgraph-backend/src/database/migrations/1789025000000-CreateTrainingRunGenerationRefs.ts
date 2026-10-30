import { MigrationInterface, QueryRunner } from 'typeorm';

// A recorded link between a training run and a generation it used.
//
// Additive and without a backfill: no rows are added, so every existing run has
// no recorded generation link until someone records one. Nothing is inferred
// from timing or names (ARCH-004).
//
// Rollback (down) drops the table. The only data lost is the links themselves;
// runs and generations are untouched.
export class CreateTrainingRunGenerationRefs1789025000000
  implements MigrationInterface
{
  name = 'CreateTrainingRunGenerationRefs1789025000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "training_run_generation_refs" (
        "training_run_id" uuid NOT NULL,
        "generation_id" uuid NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_training_run_generation_refs"
          PRIMARY KEY ("training_run_id", "generation_id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_training_run_generation_refs_training_run_id"
      ON "training_run_generation_refs" ("training_run_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_training_run_generation_refs_generation_id"
      ON "training_run_generation_refs" ("generation_id")
    `);

    await queryRunner.query(`
      ALTER TABLE "training_run_generation_refs"
      ADD CONSTRAINT "FK_training_run_generation_refs_training_run_id"
      FOREIGN KEY ("training_run_id")
      REFERENCES "training_runs"("id")
      ON DELETE RESTRICT
      ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "training_run_generation_refs"
      ADD CONSTRAINT "FK_training_run_generation_refs_generation_id"
      FOREIGN KEY ("generation_id")
      REFERENCES "generations"("id")
      ON DELETE RESTRICT
      ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "training_run_generation_refs"`);
  }
}
