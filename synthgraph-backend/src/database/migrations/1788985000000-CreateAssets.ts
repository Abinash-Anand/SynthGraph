import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAssets1788985000000 implements MigrationInterface {
  name = 'CreateAssets1788985000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "assets" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "name" character varying NOT NULL, "type" character varying, "description" text, "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_da96729a8b113377cfb6a62439c" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_assets_user_id" ON "assets"  ("user_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "asset_versions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "asset_id" uuid NOT NULL, "version" character varying NOT NULL, "uri" text NOT NULL, "size" bigint, "checksum" character varying, "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_1cf5a5f001c2f2b40c78be0dc16" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_asset_versions_asset_id" ON "asset_versions"  ("asset_id") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_asset_versions_asset_version" ON "asset_versions"  ("asset_id", "version") `,
    );
    await queryRunner.query(
      `CREATE TABLE "generation_asset_refs" ("generation_id" uuid NOT NULL, "asset_version_id" uuid NOT NULL, "role" character varying NOT NULL, CONSTRAINT "PK_7c8e6c6c3d0c6e0a7a3f8f2f5c1" PRIMARY KEY ("generation_id", "asset_version_id", "role"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_generation_asset_refs_generation_id" ON "generation_asset_refs"  ("generation_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_generation_asset_refs_asset_version_id" ON "generation_asset_refs"  ("asset_version_id") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_generation_asset_reference" ON "generation_asset_refs"  ("generation_id", "asset_version_id", "role") `,
    );

    await queryRunner.query(
      `ALTER TABLE "assets" ADD CONSTRAINT "FK_assets_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "asset_versions" ADD CONSTRAINT "FK_asset_versions_asset_id" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "generation_asset_refs" ADD CONSTRAINT "FK_generation_asset_refs_generation_id" FOREIGN KEY ("generation_id") REFERENCES "generations"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "generation_asset_refs" ADD CONSTRAINT "FK_generation_asset_refs_asset_version_id" FOREIGN KEY ("asset_version_id") REFERENCES "asset_versions"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "generation_asset_refs" DROP CONSTRAINT "FK_generation_asset_refs_asset_version_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "generation_asset_refs" DROP CONSTRAINT "FK_generation_asset_refs_generation_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "asset_versions" DROP CONSTRAINT "FK_asset_versions_asset_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "assets" DROP CONSTRAINT "FK_assets_user_id"`,
    );

    await queryRunner.query(
      `DROP INDEX "public"."UQ_generation_asset_reference"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_generation_asset_refs_asset_version_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_generation_asset_refs_generation_id"`,
    );
    await queryRunner.query(`DROP TABLE "generation_asset_refs"`);

    await queryRunner.query(
      `DROP INDEX "public"."UQ_asset_versions_asset_version"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_asset_versions_asset_id"`,
    );
    await queryRunner.query(`DROP TABLE "asset_versions"`);

    await queryRunner.query(`DROP INDEX "public"."IDX_assets_user_id"`);
    await queryRunner.query(`DROP TABLE "assets"`);
  }
}
