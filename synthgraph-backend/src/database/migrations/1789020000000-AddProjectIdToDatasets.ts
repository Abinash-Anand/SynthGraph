import { MigrationInterface, QueryRunner } from 'typeorm';

// The project a dataset belongs to.
//
// A dataset was owned by a user only, so one dataset could be referenced from
// several projects. From now on a dataset is used within one project (ARCH-004).
//
// Additive and without a backfill: the column is nullable with no default, so
// every existing dataset stays unscoped (NULL). A dataset is scoped the first
// time something in a project references it, in the same request, and never
// from names or timestamps. Existing references are neither validated nor
// changed.
//
// Rollback (down) drops the column. The only data lost is the recorded project
// scope; datasets, versions and their references are untouched.
export class AddProjectIdToDatasets1789020000000
  implements MigrationInterface
{
  name = 'AddProjectIdToDatasets1789020000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "datasets"
      ADD COLUMN "project_id" uuid
    `);

    await queryRunner.query(`
      ALTER TABLE "datasets"
      ADD CONSTRAINT "FK_datasets_project_id"
      FOREIGN KEY ("project_id")
      REFERENCES "projects"("id")
      ON DELETE RESTRICT
      ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_datasets_project_id" ON "datasets" ("project_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_datasets_project_id"`);

    await queryRunner.query(`
      ALTER TABLE "datasets"
      DROP CONSTRAINT "FK_datasets_project_id"
    `);

    await queryRunner.query(`
      ALTER TABLE "datasets"
      DROP COLUMN "project_id"
    `);
  }
}
