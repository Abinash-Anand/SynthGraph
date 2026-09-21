import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNameToEvaluationResults1788975000000
  implements MigrationInterface
{
  name = 'AddNameToEvaluationResults1788975000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "evaluation_results"
      ADD COLUMN "name" character varying NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "evaluation_results"
      DROP COLUMN "name"
    `);
  }
}
