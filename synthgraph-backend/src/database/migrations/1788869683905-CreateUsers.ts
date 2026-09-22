import { MigrationInterface, QueryRunner } from 'typeorm';

// Reconstructed: this file previously contained an
// AddPasswordHashToUsers1788970000000 migration (an ALTER TABLE on
// "users") instead of the CreateUsers migration its filename/timestamp
// implies. With no migration in this directory creating "users" at all,
// `migration:run` against a fresh database failed on the very first
// foreign key referencing it. password_hash is included directly here
// since the current User entity already declares it as a base column.
export class CreateUsers1788869683905 implements MigrationInterface {
  name = 'CreateUsers1788869683905';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying NOT NULL, "password_hash" character varying, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "users"`);
  }
}
