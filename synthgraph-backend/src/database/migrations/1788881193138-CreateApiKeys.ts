import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateApiKeys1788881193138 implements MigrationInterface {
  name = 'CreateApiKeys1788881193138';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_projects_user_id"`);
    await queryRunner.query(
      `CREATE TABLE "api_keys" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "key_prefix" character varying(16) NOT NULL, "key_hash" character varying NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "revoked_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_5c8a79801b44bd27b79228e1dad" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_bd55b203eb9f92b0c839038001" ON "projects"  ("user_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "api_keys" ADD CONSTRAINT "FK_a3baee01d8408cd3c0f89a9a973" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "api_keys" DROP CONSTRAINT "FK_a3baee01d8408cd3c0f89a9a973"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_bd55b203eb9f92b0c839038001"`,
    );
    await queryRunner.query(`DROP TABLE "api_keys"`);
    await queryRunner.query(
      `CREATE INDEX "IDX_projects_user_id" ON "projects" USING btree ("user_id") `,
    );
  }
}
