import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPasswordHashToUsers1788970000000
  implements MigrationInterface
{
  name = 'AddPasswordHashToUsers1788970000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN "password_hash" character varying
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN "password_hash"
    `);
  }
}