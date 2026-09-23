import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Backs the new PATCH (name/description) + DELETE (archive) routes on
 * Project/Experiment/Dataset/Asset. Every child table here uses
 * ON DELETE RESTRICT (see e.g. experiments.project_id), so a real hard
 * DELETE was never viable once any child row exists - archived_at is a
 * soft-delete: existing read paths (find-by-id, list) now filter it out,
 * so an archived row is 404/absent everywhere a real delete would make it
 * disappear, while the row and everything that references it stays intact.
 *
 * datasets has no updated_at at all today (it was correctly create-only
 * until now - CONTRACT.md's own note on the Dataset entity) - since PATCH
 * makes it mutable for the first time, it gets one here too, matching
 * every other entity in this migration.
 */
export class AddArchivedAtToProjectsExperimentsDatasetsAssets1789005000000
  implements MigrationInterface
{
  name = 'AddArchivedAtToProjectsExperimentsDatasetsAssets1789005000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "projects" ADD COLUMN "archived_at" TIMESTAMP WITH TIME ZONE NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "experiments" ADD COLUMN "archived_at" TIMESTAMP WITH TIME ZONE NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "datasets" ADD COLUMN "archived_at" TIMESTAMP WITH TIME ZONE NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "datasets" ADD COLUMN "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
    `);

    await queryRunner.query(`
      ALTER TABLE "assets" ADD COLUMN "archived_at" TIMESTAMP WITH TIME ZONE NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "assets" DROP COLUMN "archived_at"
    `);

    await queryRunner.query(`
      ALTER TABLE "datasets" DROP COLUMN "updated_at"
    `);

    await queryRunner.query(`
      ALTER TABLE "datasets" DROP COLUMN "archived_at"
    `);

    await queryRunner.query(`
      ALTER TABLE "experiments" DROP COLUMN "archived_at"
    `);

    await queryRunner.query(`
      ALTER TABLE "projects" DROP COLUMN "archived_at"
    `);
  }
}
